import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Globals } from '@react-spring/web';

import * as perf from '@/mastodon/utils/performance';
import { setupBrowserNotifications } from 'mastodon/actions/notifications';
import Mastodon from 'mastodon/containers/mastodon';
import { me, reduceMotion } from 'mastodon/initial_state';
import ready from 'mastodon/ready';
import { store } from 'mastodon/store';

import { isDevelopment, isProduction } from './utils/environment';

function main() {
  perf.start('main()');

  return ready(async () => {
    const mountNode = document.getElementById('mastodon');
    if (!mountNode) {
      throw new Error('Mount node not found');
    }
    const props = JSON.parse(
      mountNode.getAttribute('data-props') ?? '{}',
    ) as Record<string, unknown>;

    if (reduceMotion) {
      Globals.assign({
        skipAnimation: true,
      });
    }

    const { initializeEmoji } = await import('./features/emoji/index');
    await initializeEmoji();

    const root = createRoot(mountNode);
    root.render(
      <StrictMode>
        <Mastodon {...props} />
      </StrictMode>,
    );
    store.dispatch(setupBrowserNotifications());

    if (
      me &&
      'serviceWorker' in navigator &&
      (isDevelopment() || isProduction()) // Disallow testing environment
    ) {
      let swPath = '/sw.js';
      if (isDevelopment()) {
        const { default: swDevUrl } =
          await import('@/mastodon/service_worker/sw?url');
        swPath = swDevUrl;
      }

      await navigator.serviceWorker.register(swPath, {
        scope: '/',
        type: 'module',
      });

      // Do not put custom emoji preloading on the application startup path.
      // The dynamically loaded coordinator immediately exits in a normal
      // browser tab and only schedules background work for an installed PWA.
      void import('./features/emoji/static_cache')
        .then(({ scheduleCustomEmojiStaticCacheWarmup }) => {
          scheduleCustomEmojiStaticCacheWarmup();
        })
        .catch((error: unknown) => {
          console.warn('Unable to schedule custom emoji cache warmup:', error);
        });

      if (isProduction()) {
        if ('Notification' in window && Notification.permission === 'granted') {
          const registerPushNotifications =
            await import('mastodon/actions/push_notifications');

          store.dispatch(registerPushNotifications.register());
        }
      }
    }

    perf.stop('main()');
  });
}

// eslint-disable-next-line import/no-default-export
export default main;
