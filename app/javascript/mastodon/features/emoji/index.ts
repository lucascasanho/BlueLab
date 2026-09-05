import { autoPlayGif, initialState } from '@/mastodon/initial_state';

import { EMOJI_DB_RELOAD_EVENT } from './constants';
import { toSupportedLocale } from './locale';
import type { EmojiWorkerMessage } from './types';
import { emojiLogger } from './utils';

const userLocale = toSupportedLocale(initialState?.meta.locale ?? 'en');

let worker: Worker | null = null;

const log = emojiLogger('index');
const workerLog = emojiLogger('worker');

// Keep the custom emoji files warm before the picker is opened. This uses the
// same URL variant as the picker and waits for decoding so opening the picker
// can reuse the browser cache instead of painting temporary empty cells.
const preloadedCustomEmojiUrls = new Set<string>();
const customEmojiPreloadImages = new Map<string, HTMLImageElement>();
const customEmojiPreloadPromises = new Map<string, Promise<void>>();
let customEmojiPreloadPromise = Promise.resolve();

function preloadCustomEmojiImages(
  emojis: Record<string, { url: string; static_url: string }>,
) {
  const pendingPreloads: Promise<void>[] = [];

  for (const emoji of Object.values(emojis)) {
    const url = autoPlayGif ? emoji.url : emoji.static_url;
    if (!url) {
      continue;
    }

    const inFlight = customEmojiPreloadPromises.get(url);
    if (inFlight) {
      pendingPreloads.push(inFlight);
      continue;
    }

    if (preloadedCustomEmojiUrls.has(url)) {
      continue;
    }

    preloadedCustomEmojiUrls.add(url);

    const image = new Image();
    image.decoding = 'async';
    customEmojiPreloadImages.set(url, image);

    const preload = new Promise<void>((resolve) => {
      image.onload = () => {
        void image
          .decode()
          .catch(() => undefined)
          .finally(resolve);
      };
      image.onerror = () => {
        // Allow a later emoji refresh to retry assets that failed to preload.
        preloadedCustomEmojiUrls.delete(url);
        resolve();
      };
      image.src = url;
    }).finally(() => {
      image.onload = null;
      image.onerror = null;
      customEmojiPreloadImages.delete(url);
      customEmojiPreloadPromises.delete(url);
    });

    customEmojiPreloadPromises.set(url, preload);
    pendingPreloads.push(preload);
  }

  customEmojiPreloadPromise = Promise.all(pendingPreloads).then(
    () => undefined,
  );

  return customEmojiPreloadPromise;
}

export function waitForCustomEmojiImages() {
  return customEmojiPreloadPromise;
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
  void preloadCustomEmojiImages(store.getState().emojis.custom);

  log('loaded emoji data into store');
}

async function handleEmojiDbReload() {
  log('Emoji database reload needed, triggering warning');
  const { store } = await import('@/mastodon/store');
  const { needsReload } = await import('@/mastodon/actions/app');
  store.dispatch(needsReload());
}
