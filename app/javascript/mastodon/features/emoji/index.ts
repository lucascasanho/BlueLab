import { initialState } from '@/mastodon/initial_state';

import { EMOJI_DB_RELOAD_EVENT } from './constants';
import { toSupportedLocale } from './locale';
import type { EmojiWorkerMessage } from './types';
import { emojiLogger } from './utils';

const userLocale = toSupportedLocale(initialState?.meta.locale ?? 'en');

let worker: Worker | null = null;

const log = emojiLogger('index');
const workerLog = emojiLogger('worker');

interface CustomEmojiAsset {
  url: string;
  static_url: string;
}

type EmojiPreloadPriority = 'low' | 'high';

const CUSTOM_EMOJI_BACKGROUND_DELAY = 5_000;
const CUSTOM_EMOJI_IMAGE_TIMEOUT = 3_000;
const CUSTOM_EMOJI_FOREGROUND_TIMEOUT = 2_500;
const CUSTOM_EMOJI_BACKGROUND_CONCURRENCY = 1;
const CUSTOM_EMOJI_FOREGROUND_CONCURRENCY = 4;

// Only lightweight static thumbnails are warmed in the background. Animated
// custom emoji files can be much larger and must never compete with avatars or
// timeline media during the initial page load. The picker swaps visible entries
// to their animated URL separately when animation is enabled.
const knownCustomEmojiUrls = new Set<string>();
const preloadedCustomEmojiUrls = new Set<string>();
const customEmojiPreloadImages = new Map<string, HTMLImageElement>();
const customEmojiPreloadPromises = new Map<string, Promise<void>>();
let customEmojiBackgroundPreloadScheduled = false;

function rememberCustomEmojiImages(emojis: Record<string, CustomEmojiAsset>) {
  for (const emoji of Object.values(emojis)) {
    const url = emoji.static_url || emoji.url;
    if (url) {
      knownCustomEmojiUrls.add(url);
    }
  }
}

function preloadCustomEmojiImage(
  url: string,
  priority: EmojiPreloadPriority,
): Promise<void> {
  if (preloadedCustomEmojiUrls.has(url)) {
    return Promise.resolve();
  }

  const existingPreload = customEmojiPreloadPromises.get(url);
  if (existingPreload) {
    return existingPreload;
  }

  const image = new Image();
  image.decoding = 'async';
  image.setAttribute('fetchpriority', priority);
  customEmojiPreloadImages.set(url, image);

  const preload = new Promise<void>((resolve) => {
    let settled = false;
    let timeoutId = 0;

    const finish = (loaded: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      if (loaded) {
        preloadedCustomEmojiUrls.add(url);
      }
      resolve();
    };

    image.onload = () => {
      // The resource is already warm at this point. Decode when possible so a
      // picker fallback can paint from cache without a second decoding pause.
      preloadedCustomEmojiUrls.add(url);
      void image
        .decode()
        .catch(() => undefined)
        .finally(() => {
          finish(true);
        });
    };
    image.onerror = () => {
      finish(false);
    };
    timeoutId = window.setTimeout(() => {
      finish(false);
    }, CUSTOM_EMOJI_IMAGE_TIMEOUT);
    image.src = url;
  }).finally(() => {
    image.onload = null;
    image.onerror = null;
    if (!preloadedCustomEmojiUrls.has(url)) {
      image.src = '';
    }
    customEmojiPreloadImages.delete(url);
    customEmojiPreloadPromises.delete(url);
  });

  customEmojiPreloadPromises.set(url, preload);
  return preload;
}

async function preloadPendingCustomEmojiImages(
  priority: EmojiPreloadPriority,
  concurrency: number,
) {
  const urls = Array.from(knownCustomEmojiUrls).filter(
    (url) => !preloadedCustomEmojiUrls.has(url),
  );

  if (urls.length === 0) {
    return;
  }

  let cursor = 0;
  const workerCount = Math.min(concurrency, urls.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      if (url) {
        await preloadCustomEmojiImage(url, priority);
      }
    }
  });

  await Promise.all(workers);
}

function scheduleCustomEmojiImagePreload(
  emojis: Record<string, CustomEmojiAsset>,
) {
  rememberCustomEmojiImages(emojis);

  if (customEmojiBackgroundPreloadScheduled) {
    return;
  }

  customEmojiBackgroundPreloadScheduled = true;

  const schedule = () => {
    const knownUrlCount = knownCustomEmojiUrls.size;
    window.setTimeout(() => {
      void preloadPendingCustomEmojiImages(
        'low',
        CUSTOM_EMOJI_BACKGROUND_CONCURRENCY,
      ).finally(() => {
        customEmojiBackgroundPreloadScheduled = false;

        // If the emoji database changed while the background pass was active,
        // queue one more low-priority pass for only the newly discovered URLs.
        if (knownCustomEmojiUrls.size > knownUrlCount) {
          scheduleCustomEmojiImagePreload({});
        }
      });
    }, CUSTOM_EMOJI_BACKGROUND_DELAY);
  };

  if (document.readyState === 'complete') {
    schedule();
  } else {
    window.addEventListener('load', schedule, { once: true });
  }
}

export async function waitForCustomEmojiImages() {
  // Opening the picker no longer waits for this promise. Warm only static
  // fallbacks here, with bounded concurrency, so the picker can become useful
  // quickly without starving avatars or media already being fetched by the feed.
  await Promise.race([
    preloadPendingCustomEmojiImages(
      'high',
      CUSTOM_EMOJI_FOREGROUND_CONCURRENCY,
    ),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, CUSTOM_EMOJI_FOREGROUND_TIMEOUT);
    }),
  ]);
}

// This is too short, but better to fallback quickly than wait.
const WORKER_TIMEOUT = 2_000;

// Handle reload events
window.addEventListener(
  EMOJI_DB_RELOAD_EVENT,
  () => void handleEmojiDbReload(),
);

export async function initializeEmoji() {
  log('initializing emojis');

  // Create a temp worker, and assign it to the module-level worker once we know it's ready.
  let tempWorker: Worker | null = null;
  if (!worker && 'Worker' in window) {
    try {
      const { default: EmojiWorker } = await import('./worker?worker&inline');
      tempWorker = new EmojiWorker();
    } catch (err) {
      console.warn('Error creating web worker:', err);
    }
  }

  if (!tempWorker) {
    void fallbackLoad();
    return;
  }

  const timeoutId = setTimeout(() => {
    log('worker is not ready after timeout');
    void fallbackLoad();
  }, WORKER_TIMEOUT);

  tempWorker.addEventListener(
    'message',
    (event: MessageEvent<EmojiWorkerMessage>) => {
      const { data: message } = event;

      worker ??= tempWorker;
      clearTimeout(timeoutId);

      const { type } = message;
      if (type === 'log') {
        workerLog(message.message);
      } else if (type === 'done' && message.storeName === 'custom') {
        void loadEmojisToStore();
      } else if (type === 'db-blocked') {
        window.dispatchEvent(new Event(EMOJI_DB_RELOAD_EVENT));
      }

      if (type !== 'ready') {
        return; // Exit for other messages.
      }

      const debugValue = localStorage.getItem('debug');
      if (debugValue) {
        messageWorker({ type: 'debug', debugValue });
      }

      workerLog('loading data');
      messageWorker(userLocale);
      messageWorker('custom');
      messageWorker('shortcodes');
      void loadEmojisToStore();
    },
  );
}

async function fallbackLoad() {
  log('falling back to main thread for loading');

  const { importCustomEmojiData, importLegacyShortcodes, importEmojiData } =
    await import('./loader');

  const customEmojis = await importCustomEmojiData();
  if (customEmojis && customEmojis.length > 0) {
    log('loaded %d custom emojis', customEmojis.length);
  }

  const shortcodes = await importLegacyShortcodes();
  if (shortcodes?.length) {
    log('loaded %d legacy shortcodes', shortcodes.length);
  }

  const emojis = await importEmojiData(userLocale);
  if (emojis) {
    log('loaded %d emojis to locale %s', emojis.length, userLocale);
  }
  await loadEmojisToStore();
}

export async function loadCustomEmoji() {
  if (worker) {
    messageWorker('custom');
  } else {
    const { importCustomEmojiData } = await import('./loader');
    const emojis = await importCustomEmojiData();
    if (emojis && emojis.length > 0) {
      log('loaded %d custom emojis', emojis.length);
    }
  }
  await loadEmojisToStore();
}

function messageWorker(data: EmojiWorkerMessage | string) {
  if (!worker) {
    return;
  }
  if (typeof data === 'string') {
    worker.postMessage({
      type: 'load',
      storeName: data,
    } satisfies EmojiWorkerMessage);
  } else {
    worker.postMessage(data);
  }
}

async function loadEmojisToStore() {
  const { store } = await import('@/mastodon/store');
  const { loadCustomEmojis, loadLocale } =
    await import('@/mastodon/reducers/slices/emojis');

  loadLocale(userLocale);
  await store.dispatch(loadCustomEmojis());
  scheduleCustomEmojiImagePreload(store.getState().emojis.custom);

  log('loaded emoji data into store');
}

async function handleEmojiDbReload() {
  log('Emoji database reload needed, triggering warning');
  const { store } = await import('@/mastodon/store');
  const { needsReload } = await import('@/mastodon/actions/app');
  store.dispatch(needsReload());
}
