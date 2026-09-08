/// <reference lib="WebWorker" />
/// <reference types="vite/client" />

import { DAY } from '../utils/time';

const CACHE_NAME_PREFIX = 'mastodon-';
const CACHE_HEADER_TTL = 'x-timestamp';

export const CUSTOM_EMOJI_STATIC_CACHE_NAME =
  'mastodon-custom-emoji-static-v1';
export const OFFLINE_SHELL_CACHE_KEY = '/__bluelab_offline_shell__';

export function isCustomEmojiStaticImageRequest(request: Request) {
  if (request.method !== 'GET' || request.destination !== 'image') {
    return false;
  }

  const url = new URL(request.url);

  return (
    url.origin === self.location.origin &&
    /\/custom_emojis\/images\/.+\/static\/[^/]+$/.test(url.pathname)
  );
}

export async function cacheRoot() {
  // Never persist the authenticated root document in CacheStorage. It contains
  // session-specific bootstrap data and must never become an offline fallback.
  // Keep only a synthetic, identity-free document that is safe to serve later
  // when navigation fallback is implemented in a separate phase.
  const cache = await openWebCache();
  await cache.delete('/');
  await cache.put(OFFLINE_SHELL_CACHE_KEY, createOfflineShellResponse());
}

export function createOfflineShellResponse(
  language = self.navigator.language,
): Response {
  const portuguese = /^pt(?:-|$)/i.test(language);
  const copy = portuguese
    ? {
        language: 'pt-BR',
        title: 'Sem conexão',
        heading: 'Sem conexão com o servidor',
        body: 'O aplicativo está disponível, mas o conteúdo precisa de conexão para ser atualizado.',
      }
    : {
        language: 'en',
        title: 'Offline',
        heading: 'Unable to reach the server',
        body: 'The app is available, but content needs a connection to update.',
      };

  const html = `<!doctype html>
<html lang="${copy.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <title>${copy.title}</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; background: #17191f; color: #f5f5f5; }
    main { width: min(34rem, calc(100% - 2rem)); padding: 2rem; text-align: center; }
    .mark { width: 3rem; height: 3rem; margin: 0 auto 1.25rem; border: .25rem solid currentColor; border-radius: 50%; opacity: .78; }
    h1 { margin: 0 0 .75rem; font-size: clamp(1.35rem, 4vw, 1.8rem); line-height: 1.2; }
    p { margin: 0; opacity: .72; line-height: 1.55; }
    @media (prefers-color-scheme: light) { body { background: #f7f7f8; color: #202126; } }
  </style>
</head>
<body>
  <main role="main" aria-live="polite">
    <div class="mark" aria-hidden="true"></div>
    <h1>${copy.heading}</h1>
    <p>${copy.body}</p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'Content-Type': 'text/html; charset=utf-8',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function handleFetch(event: FetchEvent) {
  const url = new URL(event.request.url);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  if (url.pathname === '/auth/sign_out') {
    event.respondWith(handleLogout(event));
  } else if (/intl\/.*\.js$/.test(url.pathname)) {
    event.respondWith(cacheFirst({ event, name: 'locales' }));
  } else if (event.request.destination === 'font') {
    event.respondWith(cacheFirst({ event, name: 'fonts' }));
  } else if (event.request.destination === 'image') {
    event.respondWith(handleImageFetch(event));
  }
}

async function handleImageFetch(event: FetchEvent) {
  if (isCustomEmojiStaticImageRequest(event.request)) {
    const customEmojiCache = await caches.open(CUSTOM_EMOJI_STATIC_CACHE_NAME);
    const cachedResponse = await customEmojiCache.match(event.request);

    if (cachedResponse) {
      return cachedResponse;
    }
  }

  return cacheFirst({ event, name: 'images', ttl: DAY * 7 });
}

async function cacheFirst({
  event,
  name,
  ttl = DAY * 30,
  max = 5,
}: {
  event: FetchEvent;
  name: string;
  ttl?: number;
  max?: number;
}) {
  const cache = await caches.open(`${CACHE_NAME_PREFIX}${name}`);
  const request = event.request;
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    const ttlHeader = Number.parseInt(
      cachedResponse.headers.get(CACHE_HEADER_TTL) ?? '0',
    );

    if (!ttlHeader || ttlHeader + ttl > Date.now()) {
      event.waitUntil(expireCachedItems({ name, ttl, max }));
      return cachedResponse;
    }
  }

  const networkResponse = await fetch(request);

  // Cache maintenance must not sit on the critical image-rendering path. In
  // particular, opening the custom emoji picker can create many concurrent
  // image requests; awaiting CacheStorage writes here delays avatars, headers,
  // media and emoji painting even after their network response has arrived.
  if (networkResponse.status !== 0) {
    const cloneHeaders = new Headers(networkResponse.headers);
    cloneHeaders.set(CACHE_HEADER_TTL, Date.now().toString());

    const cloneResponse = new Response(networkResponse.clone().body, {
      headers: cloneHeaders,
      status: networkResponse.status,
      statusText: networkResponse.statusText,
    });

    event.waitUntil(
      (async () => {
        await cache.put(request, cloneResponse);
        await expireCachedItems({ name, ttl, max });
      })(),
    );
  } else {
    event.waitUntil(expireCachedItems({ name, ttl, max }));
  }

  return networkResponse;
}

export async function expireCachedItems({
  name,
  ttl = DAY * 30,
  max = 5,
}: {
  name: string;
  ttl?: number;
  max?: number;
}) {
  const cache = await caches.open(`${CACHE_NAME_PREFIX}${name}`);

  const keys = await cache.keys();
  const now = Date.now();
  const validKeys: { key: Request; timestamp: number }[] = [];

  for (const key of keys) {
    const cachedResponse = await cache.match(key);

    if (!cachedResponse) {
      await cache.delete(key);
      continue;
    }

    const timestamp = Number.parseInt(
      cachedResponse.headers.get(CACHE_HEADER_TTL) ?? '0',
    );

    if (!timestamp || timestamp + ttl > now) {
      validKeys.push({ key, timestamp: timestamp || Number.POSITIVE_INFINITY });
      continue;
    }

    await cache.delete(key);
  }

  if (validKeys.length <= max) {
    return;
  }

  const sortedValidKeys = validKeys.toSorted(
    ({ timestamp: a }, { timestamp: b }) => a - b,
  );
  await Promise.all(
    sortedValidKeys
      .slice(0, sortedValidKeys.length - max)
      .map(({ key }) => cache.delete(key)),
  );
}

function openWebCache() {
  return caches.open(`${CACHE_NAME_PREFIX}web`);
}

async function handleLogout(event: FetchEvent) {
  const response = await fetch(event.request);

  if (response.ok || response.type === 'opaqueredirect') {
    const cache = await openWebCache();
    await cache.delete('/');
  }

  return response;
}
