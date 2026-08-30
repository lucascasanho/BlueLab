import { EMOJI_MODE_NATIVE_WITH_FLAGS } from './constants';
import { determineEmojiMode, shouldReplaceFlags } from './mode';

describe('Chromium flag emoji support', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('uses the flag-only fallback without relying on canvas detection', () => {
    expect(shouldReplaceFlags()).toBe(true);
    expect(determineEmojiMode('native')).toBe(EMOJI_MODE_NATIVE_WITH_FLAGS);
  });

  test('uses the same safe fallback on non-Windows Chromium browsers', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
    });

    expect(shouldReplaceFlags()).toBe(true);
    expect(determineEmojiMode('native')).toBe(EMOJI_MODE_NATIVE_WITH_FLAGS);
  });
});
