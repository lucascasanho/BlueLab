type StaticEmojiUrlLoader = (shortcode: string) => Promise<string | undefined>;

const attemptedStaticFallbacks = new WeakSet<HTMLImageElement>();
const preparedComposeImages = new WeakSet<HTMLImageElement>();

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

const composeEmojiContext = (image: HTMLImageElement) => {
  const editor = image.closest<HTMLElement>(
    '[data-compose-scroll-zone="editor"]',
  );
  const emojiElement = image.closest<HTMLElement>('[data-emoji-shortcode]');
  const shortcode = emojiElement?.dataset.emojiShortcode;

  if (!editor || !emojiElement || !shortcode || !editor.contains(emojiElement)) {
    return null;
  }

  return { emojiElement, shortcode };
};

const tryStaticComposeEmojiImage = async (
  image: HTMLImageElement,
  shortcode: string,
  loadStaticUrl: StaticEmojiUrlLoader,
) => {
  try {
    const staticUrl = await loadStaticUrl(bareShortcode(shortcode));
    if (!image.isConnected) return false;

    if (staticUrl) {
      attemptedStaticFallbacks.add(image);
      if (staticUrl !== image.getAttribute('src')) {
        image.src = staticUrl;
      }
      return true;
    }
  } catch {
    // A later image error still has a visible shortcode fallback.
  }

  return false;
};

export const prepareComposeEmojiImage = async (
  image: HTMLImageElement,
  loadStaticUrl: StaticEmojiUrlLoader = loadStaticEmojiUrl,
) => {
  const context = composeEmojiContext(image);
  if (!context || preparedComposeImages.has(image)) return false;

  preparedComposeImages.add(image);
  return tryStaticComposeEmojiImage(image, context.shortcode, loadStaticUrl);
};

export const applyComposeEmojiImageFallback = async (
  image: HTMLImageElement,
  loadStaticUrl: StaticEmojiUrlLoader = loadStaticEmojiUrl,
) => {
  const context = composeEmojiContext(image);
  if (!context) return false;

  if (!attemptedStaticFallbacks.has(image)) {
    const staticApplied = await tryStaticComposeEmojiImage(
      image,
      context.shortcode,
      loadStaticUrl,
    );
    if (staticApplied) return true;
  }

  if (!image.isConnected) return false;

  context.emojiElement.textContent = context.shortcode;
  return true;
};

const prepareImagesIn = (root: ParentNode) => {
  if (
    root instanceof HTMLImageElement &&
    root.matches(
      '[data-compose-scroll-zone="editor"] [data-emoji-shortcode] img',
    )
  ) {
    void prepareComposeEmojiImage(root);
  }

  for (const image of root.querySelectorAll<HTMLImageElement>(
    '[data-compose-scroll-zone="editor"] [data-emoji-shortcode] img',
  )) {
    void prepareComposeEmojiImage(image);
  }
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
  prepareImagesIn(document);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          prepareImagesIn(node);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
};
