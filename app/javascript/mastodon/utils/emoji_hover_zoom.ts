const EMOJI_SELECTOR = 'img.emojione, .emoji-native';

let preview: HTMLElement | null = null;
let initialized = false;

function removePreview() {
  preview?.remove();
  preview = null;
}

export function initializeEmojiHoverZoom() {
  if (
    initialized ||
    !window.matchMedia('(hover: hover) and (pointer: fine)').matches
  )
    return;

  initialized = true;

  document.addEventListener('pointerover', (event) => {
    if (!(event.target instanceof Element)) return;

    const emoji = event.target.closest<HTMLElement>(EMOJI_SELECTOR);
    if (!emoji || emoji.classList.contains('emoji-hover-zoom-preview')) return;

    removePreview();

    const rect = emoji.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(emoji);
    const clone = emoji.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return;

    clone.removeAttribute('id');
    clone.className = 'emoji-hover-zoom-preview';
    clone.style.left = `${rect.left + rect.width / 2}px`;
    clone.style.top = `${rect.top + rect.height / 2}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.fontSize = computedStyle.fontSize;
    clone.style.lineHeight = computedStyle.lineHeight;
    document.body.appendChild(clone);
    preview = clone;

    requestAnimationFrame(() => {
      clone.classList.add('emoji-hover-zoom-preview--visible');
    });
  });

  document.addEventListener('pointerout', (event) => {
    if (
      !(event.target instanceof Element) ||
      !event.target.closest(EMOJI_SELECTOR)
    )
      return;

    removePreview();
  });

  window.addEventListener('blur', () => {
    removePreview();
  });
  document.addEventListener('scroll', removePreview, true);
}
