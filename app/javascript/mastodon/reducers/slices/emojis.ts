import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { Locale } from 'emojibase';

import type { ApiCustomEmojiJSON } from '@/mastodon/api_types/custom_emoji';
import { toSupportedLocale } from '@/mastodon/features/emoji/locale';
import { createAsyncThunk } from '@/mastodon/store/typed_functions';

interface EmojisState {
  custom: Record<string, Pick<ApiCustomEmojiJSON, 'url' | 'static_url'>>;
  customCategories: Record<string, string[]>; // { name: shortcodes[] }
  customLoaded: boolean;
  localesLoaded: Locale[];
}

const initialState: EmojisState = {
  custom: {},
  customCategories: {},
  customLoaded: false,
  localesLoaded: [],
};

const emojisSlice = createSlice({
  name: 'emojis',
  initialState,
  reducers: {
    loadLocale(state, action: PayloadAction<string>) {
      const locale = toSupportedLocale(action.payload);
      if (!state.localesLoaded.includes(locale)) {
        state.localesLoaded.push(locale);
      }
    },
  },
  extraReducers(builder) {
    builder.addAsyncThunk(loadCustomEmojis, {
      fulfilled(state, action) {
        // `null` means the IndexedDB catalog has not been initialized yet.
        // An empty array is different: it is a valid catalog and must clear any
        // emojis/categories left from an older load.
        if (action.payload === null) {
          return;
        }

        const custom: EmojisState['custom'] = {};
        const customCategories: EmojisState['customCategories'] = {};

        for (const emoji of action.payload) {
          const { shortcode, category, url, static_url } = emoji;
          custom[shortcode] = {
            url,
            static_url,
          };

          if (category) {
            customCategories[category] ??= [];
            customCategories[category].push(shortcode);
          }
        }

        state.custom = custom;
        state.customCategories = customCategories;
        state.customLoaded = true;
      },
    });
  },
});

export const emojis = emojisSlice.reducer;
export const { loadLocale } = emojisSlice.actions;

export const loadCustomEmojis = createAsyncThunk(
  `${emojisSlice.name}/loadCustomEmojis`,
  async () => {
    const { loadAllCustomEmoji } =
      await import('@/mastodon/features/emoji/database');
    return loadAllCustomEmoji();
  },
);
