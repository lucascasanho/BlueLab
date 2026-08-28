import { loadLocale } from 'mastodon/locales';
import main from 'mastodon/main';
import { loadPolyfills } from 'mastodon/polyfills';
import { initializeEmojiHoverZoom } from 'mastodon/utils/emoji_hover_zoom';

loadPolyfills()
  .then(loadLocale)
  .then(() => {
    initializeEmojiHoverZoom();
    return main();
  })
  .catch((e: unknown) => {
    console.error(e);
  });
