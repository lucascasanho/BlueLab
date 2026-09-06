import { describe, expect, test } from 'vitest';

import { preparePickerCustomEmojiImages } from './emoji_picker';

describe('preparePickerCustomEmojiImages', () => {
  test('shows the static fallback without disabling the animated lazy upgrade', () => {
    const root = document.createElement('div');
    const image = document.createElement('img');
    const animatedUrl = 'https://example.com/emoji.gif';
    const staticUrl = 'https://example.com/emoji.png';

    image.className = 'lazy';
    image.dataset.src = animatedUrl;
    root.appendChild(image);

    preparePickerCustomEmojiImages(root, new Map([[animatedUrl, staticUrl]]));

    expect(image.src).toBe(staticUrl);
    expect(image.loading).toBe('eager');
    expect(image.decoding).toBe('async');
    expect(image.getAttribute('fetchpriority')).toBe('low');
    expect(image.classList.contains('lazy')).toBe(true);
    expect(image.dataset.src).toBe(animatedUrl);
  });

  test('shows the preferred source when no separate static fallback exists', () => {
    const root = document.createElement('div');
    const image = document.createElement('img');
    const staticUrl = 'https://example.com/emoji.png';

    image.className = 'lazy';
    image.dataset.src = staticUrl;
    root.appendChild(image);

    preparePickerCustomEmojiImages(root, new Map());

    expect(image.src).toBe(staticUrl);
    expect(image.loading).toBe('eager');
    expect(image.classList.contains('lazy')).toBe(true);
    expect(image.dataset.src).toBe(staticUrl);
  });
});
