/* eslint-disable import/extensions */
import { bucketForStatus } from './availability.js';

const MAX_MEDIA_METADATA_BYTES = 256 * 1024;

function isoNow() {
  return new Date()
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
}

function dayFromDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function syncComponents(db, config) {
  const statements = config.components.map((component) =>
    db
      .prepare(`
      INSERT INTO components (
        slug, name, description, monitor_type, target_url,
        current_status, sort_order, enabled, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'unknown', ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        monitor_type = excluded.monitor_type,
        target_url = excluded.target_url,
        sort_order = excluded.sort_order,
        enabled = 1,
        updated_at = CURRENT_TIMESTAMP
    `)
      .bind(
        component.slug,
        component.name,
        component.description,
        component.monitorType,
        component.targetUrl,
        component.sortOrder,
      ),
  );

  if (!statements.length) return;

  const activePlaceholders = config.components.map(() => '?').join(', ');
  statements.push(
    db
      .prepare(`
        UPDATE components
        SET enabled = 0, updated_at = CURRENT_TIMESTAMP
        WHERE enabled = 1 AND slug NOT IN (${activePlaceholders})
      `)
      .bind(...config.components.map((component) => component.slug)),
  );

  await db.batch(statements);
}

async function recordCheck(db, component, result, checkedAt = new Date()) {
  const checkedAtSql = checkedAt
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
  const day = dayFromDate(checkedAt);
  const bucket = bucketForStatus(result.status);
  const lastOkAt =
    result.status === 'operational' ? checkedAtSql : component.last_ok_at;

  const statements = [
    db
      .prepare(`
      INSERT INTO checks (
        component_id, status, http_status, response_ms, message, checked_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)
      .bind(
        component.id,
        result.status,
        result.httpStatus ?? null,
        result.responseMs ?? null,
        result.message ?? null,
        checkedAtSql,
      ),
    db
      .prepare(`
      UPDATE components
      SET current_status = ?, last_checked_at = ?, last_ok_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
      .bind(result.status, checkedAtSql, lastOkAt ?? null, component.id),
  ];

  // Unknown means that the monitor has no evidence either way. Keep the raw
  // check for diagnostics, but do not lower uptime by counting it as failure.
  if (bucket !== 'unknown') {
    const upIncrement = bucket === 'up' ? 1 : 0;
    const degradedIncrement = bucket === 'degraded' ? 1 : 0;
    const downIncrement = bucket === 'down' ? 1 : 0;

    statements.push(
      db
        .prepare(`
        INSERT INTO daily_stats (
          component_id, day, total_checks, up_checks, degraded_checks, down_checks
        ) VALUES (?, ?, 1, ?, ?, ?)
        ON CONFLICT(component_id, day) DO UPDATE SET
          total_checks = total_checks + 1,
          up_checks = up_checks + excluded.up_checks,
          degraded_checks = degraded_checks + excluded.degraded_checks,
          down_checks = down_checks + excluded.down_checks
      `)
        .bind(component.id, day, upIncrement, degradedIncrement, downIncrement),
    );
  }

  await db.batch(statements);
}

async function checkHttpAttempt(component) {
  const started = Date.now();
  try {
    const response = await fetch(component.target_url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': 'BlueLab Status Monitor/1.0' },
      signal: AbortSignal.timeout(10_000),
    });

    const responseMs = Date.now() - started;
    const ok = response.status >= 200 && response.status < 400;
    return {
      status: ok ? 'operational' : 'major_outage',
      httpStatus: response.status,
      responseMs,
      message: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'major_outage',
      httpStatus: null,
      responseMs: Date.now() - started,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function publicMediaUrl(metadata, metadataUrl) {
  const candidates = [
    metadata?.thumbnail?.url,
    metadata?.thumbnail?.versions?.['@1x'],
    ...(Array.isArray(metadata?.icon)
      ? metadata.icon.map((icon) => icon?.src)
      : []),
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate) continue;

    try {
      const url = new URL(candidate, metadataUrl);
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      if (url.username || url.password) continue;
      return url.toString();
    } catch {
      // Ignore malformed URLs published in instance metadata.
    }
  }

  return null;
}

async function readMediaMetadata(response) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_MEDIA_METADATA_BYTES
  ) {
    await response.body?.cancel();
    throw new Error('Metadados de mídia excederam o limite de tamanho');
  }

  if (!response.body) return {};

  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_MEDIA_METADATA_BYTES) {
        throw new Error('Metadados de mídia excederam o limite de tamanho');
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function checkMediaAttempt(component) {
  const started = Date.now();

  try {
    const metadataResponse = await fetch(component.target_url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        accept: 'application/json',
        'user-agent': 'BlueLab Status Monitor/1.0',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (metadataResponse.status < 200 || metadataResponse.status >= 400) {
      await metadataResponse.body?.cancel();
      return {
        status: 'major_outage',
        httpStatus: metadataResponse.status,
        responseMs: Date.now() - started,
        message: `Metadados de mídia HTTP ${metadataResponse.status}`,
      };
    }

    const metadata = await readMediaMetadata(metadataResponse);
    const mediaUrl = publicMediaUrl(metadata, component.target_url);
    if (!mediaUrl) {
      return {
        status: 'major_outage',
        httpStatus: metadataResponse.status,
        responseMs: Date.now() - started,
        message: 'A instância não publicou um arquivo de mídia verificável',
      };
    }

    const mediaResponse = await fetch(mediaUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        accept: 'image/*,video/*,application/octet-stream',
        'cache-control': 'no-cache',
        range: 'bytes=0-0',
        'user-agent': 'BlueLab Status Monitor/1.0',
      },
      signal: AbortSignal.timeout(10_000),
      cf: { cacheTtl: 0 },
    });
    await mediaResponse.body?.cancel();

    const contentType = (mediaResponse.headers.get('content-type') || '')
      .split(';')[0]
      .trim();
    const ok =
      mediaResponse.status >= 200 &&
      mediaResponse.status < 400 &&
      (contentType.startsWith('image/') ||
        contentType === 'application/octet-stream');
    return {
      status: ok ? 'operational' : 'major_outage',
      httpStatus: mediaResponse.status,
      responseMs: Date.now() - started,
      message: `Mídia HTTP ${mediaResponse.status}`,
    };
  } catch (error) {
    return {
      status: 'major_outage',
      httpStatus: null,
      responseMs: Date.now() - started,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

// A single transient Cloudflare/Tunnel/network error must not become downtime.
// Retry once inside the same scheduled sample; only two consecutive failures
// are recorded as an unavailable check.
export async function checkHttp(component) {
  const checkAttempt =
    component.slug === 'media-storage' ? checkMediaAttempt : checkHttpAttempt;
  const first = await checkAttempt(component);
  if (first.status === 'operational') return first;

  const second = await checkAttempt(component);
  if (second.status === 'operational') {
    return {
      ...second,
      message: `${second.message}; recuperado na segunda tentativa`,
    };
  }

  return {
    ...second,
    message: `${second.message}; falhou em duas tentativas`,
  };
}

async function checkHeartbeat(component, now = new Date()) {
  if (!component.last_ok_at) {
    return {
      status: 'unknown',
      message: 'Nenhum heartbeat recebido',
    };
  }

  const ageSeconds = Math.max(
    0,
    Math.floor(
      (now.getTime() - new Date(`${component.last_ok_at}Z`).getTime()) / 1000,
    ),
  );
  const status =
    ageSeconds <= 180
      ? 'operational'
      : ageSeconds <= 600
        ? 'degraded'
        : 'major_outage';

  return {
    status,
    message: `Último heartbeat há ${ageSeconds}s`,
  };
}

export async function runScheduledChecks(db) {
  const { results = [] } = await db
    .prepare(`
    SELECT id, slug, monitor_type, target_url, last_ok_at
    FROM components
    WHERE enabled = 1 AND monitor_type IN ('http', 'heartbeat')
    ORDER BY sort_order
  `)
    .all();

  for (const component of results) {
    let result;
    if (component.monitor_type === 'http') {
      if (!component.target_url) continue;
      result = await checkHttp(component);
    } else {
      result = await checkHeartbeat(component);
    }
    await recordCheck(db, component, result);
  }

  await db
    .prepare(
      "DELETE FROM checks WHERE checked_at < datetime('now', '-100 days')",
    )
    .run();
}

export async function receiveHeartbeat(db, slug) {
  const aliases = {
    sidekiq: 'background-queues',
    'background-queues': 'background-queues',
  };
  const componentSlug = aliases[slug];
  if (!componentSlug) return false;

  const component = await db
    .prepare(`
    SELECT id, slug, last_ok_at
    FROM components
    WHERE slug = ? AND enabled = 1
  `)
    .bind(componentSlug)
    .first();
  if (!component) return false;

  const now = new Date();
  const checkedAt = now
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');

  await db
    .prepare(`
    UPDATE components
    SET current_status = 'operational',
        last_checked_at = ?,
        last_ok_at = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
    .bind(checkedAt, checkedAt, component.id)
    .run();

  return true;
}

export async function getDashboardData(db) {
  const [
    { results: components = [] },
    { results: stats = [] },
    { results: incidents = [] },
  ] = await Promise.all([
    db
      .prepare(`
      SELECT id, slug, name, description, current_status, sort_order, last_checked_at, last_ok_at
      FROM components
      WHERE enabled = 1
      ORDER BY sort_order
    `)
      .all(),
    db
      .prepare(`
      SELECT component_id, day, total_checks, up_checks, degraded_checks, down_checks
      FROM daily_stats
      WHERE day >= date('now', '-89 days')
      ORDER BY day
    `)
      .all(),
    db
      .prepare(`
      SELECT id, slug, title, status, impact, summary, started_at, resolved_at
      FROM incidents
      WHERE started_at >= datetime('now', '-7 days')
      ORDER BY started_at DESC
    `)
      .all(),
  ]);

  return { components, stats, incidents };
}

export function healthPayload(config) {
  return {
    ok: true,
    service: 'bluelab-status',
    instance: config.name,
    timestamp: isoNow(),
  };
}
