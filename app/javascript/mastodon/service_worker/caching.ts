/// <reference lib="WebWorker" />
/// <reference types="vite/client" />

import { DAY } from '../utils/time';

const CACHE_NAME_PREFIX = 'mastodon-';
const CACHE_HEADER_TTL = 'x-timestamp';

export const CUSTOM_EMOJI_STATIC_CACHE_NAME =
  'mastodon-custom-emoji-static-v1';

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
  // session-specific bootstrap data and is not used as a navigation fallback.
  // Remove any legacy entry left by older workers while keeping the cache name
  // available for the existing logout cleanup path.
  const cache = await openWebCache();
  await cache.delete('/');
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
