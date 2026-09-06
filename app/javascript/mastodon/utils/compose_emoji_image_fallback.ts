type StaticEmojiUrlLoader = (shortcode: string) => Promise<string | undefined>;

const attemptedStaticFallbacks = new WeakSet<HTMLImageElement>();

const loadStaticEmojiUrl: StaticEmojiUrlLoader = async (shortcode) => {
  const { loadCustomEmojiByShortcode } =
    await import('../features/emoji/database');
  const emoji = await loadCustomEmojiByShortcode(shortcode);
  return emoji?.static_url;
};

const bareShortcode = (shortcode: string) =>
  shortcode.startsWith(':') && shortcode.endsWith(':')
    ? shortcode.slice(1, -1)
    : shortcode;

export const applyComposeEmojiImageFallback = async (
  image: HTMLImageElement,
  loadStaticUrl: StaticEmojiUrlLoader = loadStaticEmojiUrl,
) => {
  const editor = image.closest<HTMLElement>(
    '[data-compose-scroll-zone="editor"]',
  );
  const emojiElement = image.closest<HTMLElement>('[data-emoji-shortcode]');
  const shortcode = emojiElement?.dataset.emojiShortcode;

  if (!editor || !emojiElement || !shortcode || !editor.contains(emojiElement)) {
    return false;
  }

  if (!attemptedStaticFallbacks.has(image)) {
    attemptedStaticFallbacks.add(image);

    try {
      const staticUrl = await loadStaticUrl(bareShortcode(shortcode));
      if (!image.isConnected) return false;

      if (staticUrl && staticUrl !== image.getAttribute('src')) {
        image.src = staticUrl;
        return true;
      }
    } catch {
      // If the local emoji database cannot provide a usable static image,
      // preserve a visible shortcode instead of leaving a blank inline object.
    }
  }

  if (!image.isConnected) return false;

  emojiElement.textContent = shortcode;
  return true;
};

const handleImageError = (event: Event) => {
  if (event.target instanceof HTMLImageElement) {
    void applyComposeEmojiImageFallback(event.target);
  }
};

let initialized = false;

export const initializeComposeEmojiImageFallback = () => {
  if (initialized) return;
  initialized = true;
  document.addEventListener('error', handleImageError, true);
};
