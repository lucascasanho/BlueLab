import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  applyComposeEmojiImageFallback,
  prepareComposeEmojiImage,
} from './compose_emoji_image_fallback';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const buildEditorEmoji = () => {
  const editor = document.createElement('div');
  editor.dataset.composeScrollZone = 'editor';
  editor.innerHTML =
    '<span data-emoji-shortcode=":party:" contenteditable="false"><img src="https://example.test/animated.gif" alt=":party:" /></span>';
  document.body.appendChild(editor);

  const image = editor.querySelector('img');
  const emojiElement = editor.querySelector<HTMLElement>(
    '[data-emoji-shortcode]',
  );
  if (!image || !emojiElement) {
    throw new Error('Expected rendered compose custom emoji');
  }

  return { editor, image, emojiElement };
};

describe('compose custom emoji image fallback', () => {
  test('prefers the lightweight static thumbnail as soon as the emoji is rendered', async () => {
    const { image, emojiElement } = buildEditorEmoji();
    const loadStaticUrl = vi
      .fn()
      .mockResolvedValue('https://example.test/static.png');

    await expect(
      prepareComposeEmojiImage(image, loadStaticUrl),
    ).resolves.toBe(true);

    expect(loadStaticUrl).toHaveBeenCalledWith('party');
    expect(image.getAttribute('src')).toBe('https://example.test/static.png');
    expect(emojiElement.dataset.emojiShortcode).toBe(':party:');
  });

  test('retries a failed animated image with the static custom emoji URL', async () => {
    const { image, emojiElement } = buildEditorEmoji();
    const loadStaticUrl = vi
      .fn()
      .mockResolvedValue('https://example.test/static.png');

    await expect(
      applyComposeEmojiImageFallback(image, loadStaticUrl),
    ).resolves.toBe(true);

    expect(loadStaticUrl).toHaveBeenCalledWith('party');
    expect(image.getAttribute('src')).toBe('https://example.test/static.png');
    expect(emojiElement.dataset.emojiShortcode).toBe(':party:');
  });

  test('shows the shortcode if the prepared static thumbnail also fails', async () => {
    const { image, emojiElement } = buildEditorEmoji();
    const loadStaticUrl = vi
      .fn()
      .mockResolvedValue('https://example.test/static.png');

    await prepareComposeEmojiImage(image, loadStaticUrl);
    await applyComposeEmojiImageFallback(image, loadStaticUrl);

    expect(loadStaticUrl).toHaveBeenCalledOnce();
    expect(emojiElement.dataset.emojiShortcode).toBe(':party:');
    expect(emojiElement.textContent).toBe(':party:');
  });

  test('shows the shortcode when the local emoji lookup fails after an image error', async () => {
    const { image, emojiElement } = buildEditorEmoji();
    const loadStaticUrl = vi.fn().mockRejectedValue(new Error('db unavailable'));

    await expect(
      applyComposeEmojiImageFallback(image, loadStaticUrl),
    ).resolves.toBe(true);

    expect(emojiElement.textContent).toBe(':party:');
  });

  test('does not alter images outside the compose editor', async () => {
    const image = document.createElement('img');
    image.src = 'https://example.test/broken.gif';
    document.body.appendChild(image);
    const loadStaticUrl = vi.fn();

    await expect(
      prepareComposeEmojiImage(image, loadStaticUrl),
    ).resolves.toBe(false);
    await expect(
      applyComposeEmojiImageFallback(image, loadStaticUrl),
    ).resolves.toBe(false);

    expect(loadStaticUrl).not.toHaveBeenCalled();
  });
});
