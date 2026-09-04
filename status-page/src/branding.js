const BRANDING_CACHE_SECONDS = 3600;
const ASSET_CACHE_SECONDS = 86400;

function iconArea(icon) {
  const [width, height] = String(icon?.size ?? '')
    .split('x')
    .map((value) => Number.parseInt(value, 10));

  if (!Number.isFinite(width) || !Number.isFinite(height)) return 0;
  return width * height;
}

export function selectLargestInstanceIcon(icons) {
  return [...(icons ?? [])]
    .filter((icon) => typeof icon?.src === 'string' && icon.src.length > 0)
    .sort((left, right) => iconArea(right) - iconArea(left))[0]?.src ?? null;
}

export function selectFaviconInstanceIcon(icons) {
  const candidates = [...(icons ?? [])].filter(
    (icon) => typeof icon?.src === 'string' && icon.src.length > 0,
  );

  if (!candidates.length) return null;

  return candidates.sort((left, right) => {
    const leftArea = iconArea(left);
    const rightArea = iconArea(right);
    const targetArea = 48 * 48;
    return Math.abs(leftArea - targetArea) - Math.abs(rightArea - targetArea);
  })[0]?.src ?? null;
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
  const candidates = [];

  for (const tag of tags) {
    const rel = readAttribute(tag, 'rel');
    const href = readAttribute(tag, 'href');
    if (!rel || !href || !/(^|\s)(shortcut\s+)?icon(\s|$)/i.test(rel)) continue;

    try {
      candidates.push(new URL(href, baseUrl).toString());
    } catch {
      // Ignore malformed icon URLs and continue with API/fallback icons.
    }
  }

  return candidates[0] ?? null;
}

async function fetchInstanceMetadata(baseUrl) {
  const response = await fetch(`${baseUrl}/api/v2/instance`, {
    headers: {
      accept: 'application/json',
      'user-agent': 'BlueLab Status Branding/1.0',
    },
    cf: {
      cacheEverything: true,
      cacheTtl: BRANDING_CACHE_SECONDS,
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) throw new Error(`Instance API returned HTTP ${response.status}`);
  return response.json();
}

async function fetchInstanceFavicon(baseUrl) {
  const response = await fetch(baseUrl, {
    headers: {
      accept: 'text/html',
      'user-agent': 'BlueLab Status Branding/1.0',
    },
    cf: {
      cacheEverything: true,
      cacheTtl: BRANDING_CACHE_SECONDS,
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) return null;
  return findFaviconInHtml(await response.text(), baseUrl);
}

async function resolveBranding(config) {
  const baseUrl = config.baseUrl;
  let metadata = null;
  let htmlFavicon = null;

  const [metadataResult, faviconResult] = await Promise.allSettled([
    fetchInstanceMetadata(baseUrl),
    fetchInstanceFavicon(baseUrl),
  ]);

  if (metadataResult.status === 'fulfilled') metadata = metadataResult.value;
  if (faviconResult.status === 'fulfilled') htmlFavicon = faviconResult.value;

  const apiIcons = Array.isArray(metadata?.icon) ? metadata.icon : [];
  const apiFavicon = selectFaviconInstanceIcon(apiIcons);
  const logoUrl = selectLargestInstanceIcon(apiIcons) ?? htmlFavicon ?? `${baseUrl}/favicon.ico`;
  const faviconUrl = htmlFavicon ?? apiFavicon ?? `${baseUrl}/favicon.ico`;

  return { faviconUrl, logoUrl };
}

export async function fetchBrandingAsset(config, asset) {
  const branding = await resolveBranding(config);
  const sourceUrl = asset === 'logo' ? branding.logoUrl : branding.faviconUrl;

  try {
    const upstream = await fetch(sourceUrl, {
      headers: { 'user-agent': 'BlueLab Status Branding/1.0' },
      cf: {
        cacheEverything: true,
        cacheTtl: ASSET_CACHE_SECONDS,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!upstream.ok) throw new Error(`Branding asset returned HTTP ${upstream.status}`);

    const headers = new Headers(upstream.headers);
    headers.set(
      'cache-control',
      `public, max-age=${ASSET_CACHE_SECONDS}, stale-while-revalidate=${ASSET_CACHE_SECONDS}, stale-if-error=604800`,
    );
    headers.delete('set-cookie');

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch {
    return new Response(null, {
      status: 302,
      headers: {
        location: `${config.baseUrl}/favicon.ico`,
        'cache-control': 'public, max-age=300',
      },
    });
  }
}
