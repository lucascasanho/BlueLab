import { autoPlayGif, initialState } from '@/mastodon/initial_state';

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

const CUSTOM_EMOJI_BACKGROUND_DELAY = 1_000;
const CUSTOM_EMOJI_IMAGE_TIMEOUT = 3_000;
const CUSTOM_EMOJI_FOREGROUND_TIMEOUT = 4_500;
const CUSTOM_EMOJI_BACKGROUND_CONCURRENCY = 3;
const CUSTOM_EMOJI_FOREGROUND_CONCURRENCY = 12;

// Custom emoji assets are deliberately warmed only after the initial page has
// finished loading. This keeps avatars, feed media and other user-visible
// content ahead of the picker on the browser's network queue.
const knownCustomEmojiUrls = new Set<string>();
const preloadedCustomEmojiUrls = new Set<string>();
const customEmojiPreloadImages = new Map<string, HTMLImageElement>();
const customEmojiPreloadPromises = new Map<string, Promise<void>>();
let customEmojiBackgroundPreloadScheduled = false;

function rememberCustomEmojiImages(emojis: Record<string, CustomEmojiAsset>) {
  for (const emoji of Object.values(emojis)) {
    const url = autoPlayGif ? emoji.url : emoji.static_url;
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
      // The network resource is already warm at this point. Wait for decode as
      // well when possible so the picker can paint from cache immediately.
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
  // If the user opens the picker before the background warm-up has completed,
  // temporarily increase concurrency. The hard cap prevents a single broken
  // custom emoji URL from making the desktop picker appear to never open.
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