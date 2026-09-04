/* eslint-disable import/extensions */
import { bucketForStatus } from './availability.js';

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

  if (statements.length) await db.batch(statements);
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

async function checkHttp(component) {
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
