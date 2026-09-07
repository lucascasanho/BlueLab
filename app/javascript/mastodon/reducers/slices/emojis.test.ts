import { describe, expect, test } from 'vitest';

import type { CustomEmojiData } from '@/mastodon/features/emoji/types';

import { emojis, loadCustomEmojis } from './emojis';

const customEmoji = (
  shortcode: string,
  category?: string,
): CustomEmojiData => ({
  shortcode,
  category,
  url: `https://example.com/${shortcode}.gif`,
  static_url: `https://example.com/${shortcode}.png`,
  visible_in_picker: true,
  tokens: [shortcode],
});

const fulfilled = (payload: CustomEmojiData[] | null) => ({
  type: loadCustomEmojis.fulfilled.type,
  payload,
});

describe('emojis custom catalog', () => {
  test('replaces emojis and categories instead of retaining removed entries', () => {
    let state = emojis(
      undefined,
      fulfilled([
        customEmoji('keep', 'Animals'),
        customEmoji('remove', 'Old category'),
      ]),
    );

    state = emojis(state, fulfilled([customEmoji('keep', 'New category')]));

    expect(state.custom).toEqual({
      keep: {
        url: 'https://example.com/keep.gif',
        static_url: 'https://example.com/keep.png',
      },
    });
    expect(state.customCategories).toEqual({
      'New category': ['keep'],
    });
    expect(state.customLoaded).toBe(true);
  });

  test('accepts an empty catalog as a real update', () => {
    let state = emojis(
      undefined,
      fulfilled([customEmoji('old', 'Old category')]),
    );

    state = emojis(state, fulfilled([]));

    expect(state.custom).toEqual({});
    expect(state.customCategories).toEqual({});
    expect(state.customLoaded).toBe(true);
  });

  test('does not clear state when the database is not initialized', () => {
    const state = emojis(
      undefined,
      fulfilled([customEmoji('existing', 'Existing')]),
    );

    const unchanged = emojis(state, fulfilled(null));

    expect(unchanged).toEqual(state);
  });
});
