import type { ApiCustomEmojiJSON } from '@/mastodon/api_types/custom_emoji';

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
  connection?: {
    saveData?: boolean;
  };
};

type MatchMedia = (query: string) => Pick<MediaQueryList, 'matches'>;

interface StandaloneEnvironment {
  matchMedia?: MatchMedia;
  navigatorObject?: Pick<StandaloneNavigator, 'standalone'>;
}

const CUSTOM_EMOJI_STATIC_CACHE_NAME = 'mastodon-custom-emoji-static-v1';
const WARMUP_DELAY_MS = 3_000;
const WARMUP_CONCURRENCY = 2;
const MAX_SESSION_BYTES = 64 * 1024 * 1024;
const MIN_STORAGE_HEADROOM_BYTES = 64 * 1024 * 1024;
const STORAGE_RECHECK_INTERVAL = 50;

let warmupScheduled = false;

/**
 * Returns whether the current Mastodon window is running as an installed app.
 *
 * `display-mode: standalone` covers modern Chromium and WebKit PWAs. The
 * `navigator.standalone` fallback keeps compatibility with older iOS Home
 * Screen web apps without relying on user-agent sniffing or installability
 * events.
 */
export function isStandalonePwa(
  environment: StandaloneEnvironment = {},
): boolean {
  const matchMedia =
    environment.matchMedia ??
    (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia.bind(window)
      : undefined);
  const navigatorObject =
    environment.navigatorObject ??
    (typeof navigator !== 'undefined'
      ? (navigator as StandaloneNavigator)
      : undefined);

  return (
    matchMedia?.('(display-mode: standalone)').matches === true ||
    navigatorObject?.standalone === true
  );
}

export function getWarmableStaticEmojiUrls(
  emojis: readonly Pick<ApiCustomEmojiJSON, 'static_url'>[],
  origin = window.location.origin,
): string[] {
  const urls = new Set<string>();

  for (const emoji of emojis) {
    try {
      const url = new URL(emoji.static_url, origin);
      if (url.origin === origin) {
        urls.add(url.href);
      }
    } catch {
      // Ignore malformed catalog entries. They can still fall back to the
      // picker's existing network behavior when requested directly.
    }
  }

  return [...urls];
}

export function getStaleStaticEmojiCacheRequests(
  cachedRequests: readonly Request[],
  activeUrls: readonly string[],
): Request[] {
  const activeUrlSet = new Set(activeUrls);
  return cachedRequests.filter((request) => !activeUrlSet.has(request.url));
}

/**
 * Starts a low-priority, installed-PWA-only warmup of static custom emoji
 * thumbnails. The browser version remains lazy and unchanged.
 */
export function scheduleCustomEmojiStaticCacheWarmup() {
  if (
    warmupScheduled ||
    !isStandalonePwa() ||
    typeof window === 'undefined' ||
    !('caches' in window)
  ) {
    return;
  }

  const standaloneNavigator = navigator as StandaloneNavigator;
  if (standaloneNavigator.connection?.saveData === true) {
    return;
  }

  // CacheStorage can be populated before the current page is controlled by the
  // newly registered service worker. Requiring controller here makes first-run
  // and waiting-worker PWA sessions skip the warmup permanently. Once the
  // worker controls a later page it will consume the same dedicated cache; the
  // network requests below also warm the browser HTTP cache for this session.
  warmupScheduled = true;

  const scheduleAfterLoad = () => {
    window.setTimeout(() => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => void warmCustomEmojiStaticCache(), {
          timeout: 5_000,
        });
      } else {
        window.setTimeout(() => void warmCustomEmojiStaticCache(), 0);
      }
    }, WARMUP_DELAY_MS);
  };

  if (document.readyState === 'complete') {
    scheduleAfterLoad();
  } else {
    window.addEventListener('load', scheduleAfterLoad, { once: true });
  }
}

export async function warmCustomEmojiStaticCache() {
  if (!isStandalonePwa() || !(await waitUntilCanWarm())) {
    return;
  }

  const { loadAllCustomEmoji } = await import('./database');
  const emojis = await loadAllCustomEmoji();
  if (!emojis?.length) {
    return;
  }

  const urls = getWarmableStaticEmojiUrls(emojis);
  if (!urls.length || !(await hasStorageHeadroom())) {
    return;
  }

  const cache = await caches.open(CUSTOM_EMOJI_STATIC_CACHE_NAME);
  const cachedRequests = await cache.keys();
  const staleRequests = getStaleStaticEmojiCacheRequests(cachedRequests, urls);

  // The catalog is authoritative. Remove static thumbnails whose emoji was
  // deleted or whose static_url changed, while keeping the cache shared across
  // accounts on the same instance because these assets are public.
  if (staleRequests.length > 0) {
    await Promise.all(staleRequests.map((request) => cache.delete(request)));
  }

  const staleUrls = new Set(staleRequests.map((request) => request.url));
  const existingUrls = new Set(
    cachedRequests
      .filter((request) => !staleUrls.has(request.url))
      .map((request) => request.url),
  );
  const pendingUrls = urls.filter((url) => !existingUrls.has(url));

  let nextIndex = 0;
  let downloadedBytes = 0;
  let completedItems = 0;
  let stopped = false;

  const warmNext = async () => {
    while (!stopped) {
      if (!(await waitUntilCanWarm())) {
        return;
      }

      const index = nextIndex++;
      const url = pendingUrls[index];
      if (!url) {
        return;
      }

      if (
        completedItems > 0 &&
        completedItems % STORAGE_RECHECK_INTERVAL === 0 &&
        !(await hasStorageHeadroom())
      ) {
        stopped = true;
        return;
      }

      try {
        const response = await fetch(url, {
          cache: 'force-cache',
          credentials: 'omit',
        });

        if (!isSafeStaticEmojiResponse(response)) {
          completedItems += 1;
          continue;
        }

        const responseBytes = await getResponseSize(response);
        if (
          responseBytes > 0 &&
          downloadedBytes + responseBytes > MAX_SESSION_BYTES
        ) {
          stopped = true;
          return;
        }

        downloadedBytes += responseBytes;
        await cache.put(url, response);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === 'QuotaExceededError'
        ) {
          stopped = true;
          return;
        }
        // A single unavailable emoji must not abort the rest of the warmup.
      }

      completedItems += 1;
    }
  };

  await Promise.all(
    Array.from({ length: WARMUP_CONCURRENCY }, () => warmNext()),
  );
}

function canWarmNow() {
  const standaloneNavigator = navigator as StandaloneNavigator;

  return (
    document.visibilityState === 'visible' &&
    navigator.onLine &&
    standaloneNavigator.connection?.saveData !== true
  );
}

async function waitUntilCanWarm(): Promise<boolean> {
  const standaloneNavigator = navigator as StandaloneNavigator;
  if (standaloneNavigator.connection?.saveData === true) {
    return false;
  }

  if (canWarmNow()) {
    return true;
  }

  return new Promise((resolve) => {
    const check = () => {
      if ((navigator as StandaloneNavigator).connection?.saveData === true) {
        cleanup();
        resolve(false);
      } else if (canWarmNow()) {
        cleanup();
        resolve(true);
      }
    };
    const cleanup = () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('online', check);
    };

    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', check);
  });
}

async function hasStorageHeadroom() {
  const storage = (navigator as Partial<Pick<Navigator, 'storage'>>).storage;
  if (!storage) {
    return true;
  }

  try {
    const { quota, usage } = await storage.estimate();
    if (!quota) {
      return true;
    }

    return quota - (usage ?? 0) >= MIN_STORAGE_HEADROOM_BYTES;
  } catch {
    // Storage estimates are advisory and not universally implemented. A later
    // CacheStorage QuotaExceededError remains the final safety stop.
    return true;
  }
}

function isSafeStaticEmojiResponse(response: Response) {
  if (!response.ok || response.type === 'opaque') {
    return false;
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    return false;
  }

  const cacheControl = response.headers.get('Cache-Control') ?? '';
  if (/\b(?:private|no-store)\b/i.test(cacheControl)) {
    return false;
  }

  const vary = response.headers.get('Vary') ?? '';
  if (/\b(?:cookie|authorization)\b/i.test(vary)) {
    return false;
  }

  return true;
}

async function getResponseSize(response: Response) {
  const contentLength = Number.parseInt(
    response.headers.get('Content-Length') ?? '',
    10,
  );
  if (Number.isFinite(contentLength) && contentLength > 0) {
    return contentLength;
  }

  try {
    return (await response.clone().blob()).size;
  } catch {
    return 0;
  }
}
