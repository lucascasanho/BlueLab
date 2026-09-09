import { describe, expect, test } from 'vitest';

import {
  preparePickerCustomEmojiImage,
  preparePickerCustomEmojiImages,
} from './emoji_picker';

describe('preparePickerCustomEmojiImages', () => {
  test('shows the static fallback without disabling the animated lazy upgrade', () => {
    const root = document.createElement('div');
    const image = document.createElement('img');
    const animatedUrl = 'https://example.com/emoji.gif';
    const staticUrl = 'https://example.com/emoji.png';

    image.className = 'lazy';
    image.dataset.src = animatedUrl;
    image.setAttribute('fetchpriority', 'low');
    root.appendChild(image);

    preparePickerCustomEmojiImages(root, new Map([[animatedUrl, staticUrl]]));

    expect(image.src).toBe(staticUrl);
    expect(image.loading).toBe('eager');
    expect(image.decoding).toBe('async');
    expect(image.hasAttribute('fetchpriority')).toBe(false);
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

  test('does not overwrite an emoji already upgraded by emoji-mart', () => {
    const image = document.createElement('img');
    const animatedUrl = 'https://example.com/emoji.gif';
    const staticUrl = 'https://example.com/emoji.png';

    image.dataset.src = animatedUrl;
    image.src = animatedUrl;

    expect(
      preparePickerCustomEmojiImage(image, new Map([[animatedUrl, staticUrl]])),
    ).toBe(false);
    expect(image.src).toBe(animatedUrl);
  });
});
