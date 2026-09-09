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

  if (
    !editor ||
    !emojiElement ||
    !shortcode ||
    !editor.contains(emojiElement)
  ) {
    return null;
  }

  return { emojiElement, shortcode };
};

const clearLoadingPlaceholder = (image: HTMLImageElement) => {
  image.style.backgroundImage = '';
  image.style.backgroundPosition = '';
  image.style.backgroundRepeat = '';
  image.style.backgroundSize = '';
};

const applyLoadingPlaceholder = (
  image: HTMLImageElement,
  staticUrl: string,
) => {
  const normalizedUrl = new URL(staticUrl, document.baseURI).href;
  image.style.backgroundImage = `url("${normalizedUrl}")`;
  image.style.backgroundPosition = 'center';
  image.style.backgroundRepeat = 'no-repeat';
  image.style.backgroundSize = 'contain';
};

const tryStaticComposeEmojiImage = async (
  image: HTMLImageElement,
  shortcode: string,
  loadStaticUrl: StaticEmojiUrlLoader,
) => {
  try {
    const staticUrl = await loadStaticUrl(bareShortcode(shortcode));
    if (!image.isConnected) return false;

    if (staticUrl && staticUrl !== image.getAttribute('src')) {
      attemptedStaticFallbacks.add(image);
      clearLoadingPlaceholder(image);
      image.src = staticUrl;
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
) => {
  const context = composeEmojiContext(image);
  if (!context || preparedComposeImages.has(image)) return false;

  preparedComposeImages.add(image);

  // Keep the preferred URL in src so an animated custom emoji starts loading
  // immediately. The static image is only a paint-time placeholder behind it;
  // it must never replace/cancel the preferred request while that request is
  // still healthy.
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
    staticUrl === preferredUrl ||
    (image.complete && image.naturalWidth > 0)
  ) {
    return false;
  }

  applyLoadingPlaceholder(image, staticUrl);

  const clearPlaceholder = () => {
    clearLoadingPlaceholder(image);
  };

  image.addEventListener('load', clearPlaceholder, { once: true });
  image.addEventListener('error', clearPlaceholder, { once: true });

  // Close the small race where the image finished between the previous check
  // and the event listeners being attached.
  if (image.complete && image.naturalWidth > 0) {
    clearLoadingPlaceholder(image);
    return false;
  }

  return true;
};

export const applyComposeEmojiImageFallback = async (
  image: HTMLImageElement,
  loadStaticUrl: StaticEmojiUrlLoader = loadStaticEmojiUrl,
) => {
  const context = composeEmojiContext(image);
  if (!context) return false;

  clearLoadingPlaceholder(image);

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
