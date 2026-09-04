/* eslint-disable import/extensions */
import { bundledBrandingRecord } from './brand-assets.js';

const BRANDING_CACHE_SECONDS = 300;
const ASSET_CACHE_SECONDS = 300;
const MAX_METADATA_BYTES = 256 * 1024;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_ASSET_BYTES = 512 * 1024;

function iconArea(icon) {
  const [width, height] = String(icon?.size ?? '')
    .split('x')
    .map((value) => Number.parseInt(value, 10));
  if (!Number.isFinite(width) || !Number.isFinite(height)) return 0;
  return width * height;
}

export function selectLargestInstanceIcon(icons) {
  return (
    [...(icons ?? [])]
      .filter((icon) => typeof icon?.src === 'string' && icon.src.length > 0)
      .sort((left, right) => iconArea(right) - iconArea(left))[0]?.src ?? null
  );
}

export function selectFaviconInstanceIcon(icons) {
  const candidates = [...(icons ?? [])].filter(
    (icon) => typeof icon?.src === 'string' && icon.src.length > 0,
  );
  if (!candidates.length) return null;
  const targetArea = 48 * 48;
  return (
    candidates.sort(
      (left, right) =>
        Math.abs(iconArea(left) - targetArea) -
        Math.abs(iconArea(right) - targetArea),
    )[0]?.src ?? null
  );
}

function readAttribute(tag, attribute) {
  const expression = new RegExp(
    `\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  const match = expression.exec(tag);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

export function findFaviconInHtml(html, baseUrl) {
  const tags = String(html).match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = readAttribute(tag, 'rel');
    const href = readAttribute(tag, 'href');
    if (!rel || !href || !/(^|\s)(shortcut\s+)?icon(\s|$)/i.test(rel)) continue;
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      // Continue with the icon advertised by the instance API.
    }
  }
  return null;
}

async function readBoundedBytes(response, limit) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw new Error('Branding response exceeds the size limit');
  }
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit)
        throw new Error('Branding response exceeds the size limit');
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
  return bytes;
}

function encodeBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function fetchText(url, originFetch, accept, limit) {
  const response = await originFetch(url, {
    headers: { accept, 'user-agent': 'BlueLab Status Branding/2.0' },
    cf: { cacheEverything: true, cacheTtl: BRANDING_CACHE_SECONDS },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok)
    throw new Error(`Branding source returned HTTP ${response.status}`);
  return new TextDecoder().decode(await readBoundedBytes(response, limit));
}

async function fetchAsset(url, originFetch) {
  const response = await originFetch(url, {
    headers: { accept: 'image/*', 'user-agent': 'BlueLab Status Branding/2.0' },
    cf: { cacheEverything: true, cacheTtl: BRANDING_CACHE_SECONDS },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok)
    throw new Error(`Branding asset returned HTTP ${response.status}`);
  const contentType = (response.headers.get('content-type') || '')
    .split(';')[0]
    .trim();
  if (!contentType.startsWith('image/'))
    throw new Error('Branding asset is not an image');
  const bytes = await readBoundedBytes(response, MAX_ASSET_BYTES);
  if (!bytes.length) throw new Error('Branding asset is empty');
  return { base64: encodeBase64(bytes), contentType };
}

function normalizeStoredBranding(row, config) {
  if (!row) return bundledBrandingRecord(config);
  return {
    name: row.name,
    logoBase64: row.logo_base64,
    logoContentType: row.logo_content_type,
    faviconBase64: row.favicon_base64,
    faviconContentType: row.favicon_content_type,
    refreshedAt: row.refreshed_at,
  };
}

export async function getStoredBranding(db, config) {
  const row = await db
    .prepare(`
      SELECT name, logo_base64, logo_content_type,
             favicon_base64, favicon_content_type, refreshed_at
      FROM instance_branding WHERE singleton = 1 LIMIT 1
    `)
    .first();
  return normalizeStoredBranding(row, config);
}

export async function refreshBranding(db, config, originFetch = fetch) {
  const [metadataText, html] = await Promise.all([
    fetchText(
      `${config.baseUrl}/api/v2/instance`,
      originFetch,
      'application/json',
      MAX_METADATA_BYTES,
    ),
    fetchText(config.baseUrl, originFetch, 'text/html', MAX_HTML_BYTES).catch(
      () => '',
    ),
  ]);
  const metadata = JSON.parse(metadataText);
  const icons = Array.isArray(metadata?.icon) ? metadata.icon : [];
  const htmlFavicon = findFaviconInHtml(html, config.baseUrl);
  const logoUrl =
    selectLargestInstanceIcon(icons) ??
    htmlFavicon ??
    `${config.baseUrl}/favicon.ico`;
  const faviconUrl =
    htmlFavicon ??
    selectFaviconInstanceIcon(icons) ??
    `${config.baseUrl}/favicon.ico`;
  const [logo, favicon] = await Promise.all([
    fetchAsset(logoUrl, originFetch),
    fetchAsset(faviconUrl, originFetch),
  ]);
  const name =
    String(metadata?.title || config.name)
      .trim()
      .slice(0, 120) || config.name;

  await db
    .prepare(`
      INSERT INTO instance_branding (
        singleton, name, logo_base64, logo_content_type,
        favicon_base64, favicon_content_type, refreshed_at
      ) VALUES (1, ?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)
      ON CONFLICT(singleton) DO UPDATE SET
        name = excluded.name,
        logo_base64 = excluded.logo_base64,
        logo_content_type = excluded.logo_content_type,
        favicon_base64 = excluded.favicon_base64,
        favicon_content_type = excluded.favicon_content_type,
        refreshed_at = CURRENT_TIMESTAMP
    `)
    .bind(
      name,
      logo.base64,
      logo.contentType,
      favicon.base64,
      favicon.contentType,
    )
    .run();
  return true;
}

export async function refreshBrandingIfStale(db, config, originFetch = fetch) {
  const fresh = await db
    .prepare(`
      SELECT 1 AS fresh FROM instance_branding
      WHERE singleton = 1
        AND refreshed_at >= datetime('now', '-5 minutes')
      LIMIT 1
    `)
    .first();
  if (fresh) return false;
  return refreshBranding(db, config, originFetch);
}

export async function getBrandingSummary(db, config) {
  const branding = await getStoredBranding(db, config);
  return {
    name: branding?.name || config.name,
    refreshedAt: branding?.refreshedAt || null,
    logoUrl: '/instance-logo',
    faviconUrl: '/instance-favicon',
  };
}

export async function getBrandingAsset(db, config, asset) {
  const branding = await getStoredBranding(db, config);
  if (!branding) return new Response(null, { status: 404 });
  const isLogo = asset === 'logo';
  const base64 = isLogo ? branding.logoBase64 : branding.faviconBase64;
  const contentType = isLogo
    ? branding.logoContentType
    : branding.faviconContentType;
  return new Response(decodeBase64(base64), {
    headers: {
      'cache-control': `public, max-age=${ASSET_CACHE_SECONDS}, stale-while-revalidate=86400, stale-if-error=604800`,
      'content-type': contentType,
      'x-content-type-options': 'nosniff',
    },
  });
}
