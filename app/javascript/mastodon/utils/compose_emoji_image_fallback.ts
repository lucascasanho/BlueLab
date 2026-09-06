type StaticEmojiUrlLoader = (shortcode: string) => Promise<string | undefined>;
type PreferredEmojiImagePreloader = (url: string) => Promise<void>;

const attemptedStaticFallbacks = new WeakSet<HTMLImageElement>();
const preparedComposeImages = new WeakSet<HTMLImageElement>();

const loadStaticEmojiUrl: StaticEmojiUrlLoader = async (shortcode) => {
  const { loadCustomEmojiByShortcode } =
    await import('../features/emoji/database');
  const emoji = await loadCustomEmojiByShortcode(shortcode);
  return emoji?.static_url;
};

const preloadPreferredEmojiImage: PreferredEmojiImagePreloader = async (url) => {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;

  if (typeof image.decode === 'function') {
    await image.decode();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    if (image.complete) {
      if (image.naturalWidth > 0) resolve();
      else reject(new Error('Emoji image failed to load'));
      return;
    }

    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener(
      'error',
      () => reject(new Error('Emoji image failed to load')),
      { once: true },
    );
  });
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
    // If the local emoji database cannot provide a usable static image,
    // preserve a visible shortcode instead of leaving a blank inline object.
  }

  return false;
};

export const prepareComposeEmojiImage = async (
  image: HTMLImageElement,
  loadStaticUrl: StaticEmojiUrlLoader = loadStaticEmojiUrl,
  preloadPreferredUrl: PreferredEmojiImagePreloader = preloadPreferredEmojiImage,
) => {
  const context = composeEmojiContext(image);
  if (!context || preparedComposeImages.has(image)) return false;

  preparedComposeImages.add(image);

  // If the preferred image is already available (for example because it was
  // just displayed in the picker), leave it alone so animated emoji keep
  // animating in the compose editor without an unnecessary source swap.
  if (image.complete && image.naturalWidth > 0) return false;

  const preferredUrl = image.getAttribute('src');
  if (!preferredUrl) return false;

  let staticUrl: string | undefined;
  try {
    staticUrl = await loadStaticUrl(bareShortcode(context.shortcode));
  } catch {
    return false;
  }

  if (
    !image.isConnected ||
    !staticUrl ||
    staticUrl === preferredUrl
  ) {
    return false;
  }

  // Avoid a blank inline object while a heavier animated file is still
  // decoding. The lightweight static thumbnail is only a temporary visual
  // placeholder; once the preferred file is decoded we restore its URL.
  attemptedStaticFallbacks.add(image);
  image.src = staticUrl;

  try {
    await preloadPreferredUrl(preferredUrl);
  } catch {
    // Keep the valid static image if the animated/preferred source cannot load.
    return true;
  }

  if (!image.isConnected || image.getAttribute('src') !== staticUrl) return true;

  attemptedStaticFallbacks.delete(image);
  image.src = preferredUrl;
  return true;
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
