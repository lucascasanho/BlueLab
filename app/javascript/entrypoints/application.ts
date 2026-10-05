import { loadLocale } from 'mastodon/locales';
import main from 'mastodon/main';
import { loadPolyfills } from 'mastodon/polyfills';
import { initializeComposeEmojiImageFallback } from 'mastodon/utils/compose_emoji_image_fallback';
import { initializeEmojiHoverZoom } from 'mastodon/utils/emoji_hover_zoom';
import { setupPwaInstallability } from 'mastodon/pwa_install';

loadPolyfills()
  .then(loadLocale)
  .then(() => {
    initializeComposeEmojiImageFallback();
    initializeEmojiHoverZoom();
    setupPwaInstallability();
    return main();
  })
  .catch((e: unknown) => {
    console.error(e);
  });
