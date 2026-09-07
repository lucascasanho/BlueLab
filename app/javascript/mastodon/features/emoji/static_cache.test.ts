import {
  getStaleStaticEmojiCacheRequests,
  getWarmableStaticEmojiUrls,
  isStandalonePwa,
} from './static_cache';

describe('isStandalonePwa', () => {
  test('detects Chromium and modern WebKit standalone display mode', () => {
    expect(
      isStandalonePwa({
        matchMedia: (query) => ({
          matches: query === '(display-mode: standalone)',
        }),
        navigatorObject: { standalone: false },
      }),
    ).toBe(true);
  });

  test('uses navigator.standalone as an iOS Home Screen fallback', () => {
    expect(
      isStandalonePwa({
        matchMedia: () => ({ matches: false }),
        navigatorObject: { standalone: true },
      }),
    ).toBe(true);
  });

  test('does not treat a normal browser tab as standalone', () => {
    expect(
      isStandalonePwa({
        matchMedia: () => ({ matches: false }),
        navigatorObject: { standalone: false },
      }),
    ).toBe(false);
  });

  test('does not infer installation from missing platform signals', () => {
    expect(
      isStandalonePwa({
        matchMedia: () => ({ matches: false }),
        navigatorObject: {},
      }),
    ).toBe(false);
  });
});

describe('getWarmableStaticEmojiUrls', () => {
  const origin = 'https://mastodon.blue';

  test('keeps only same-origin static thumbnails', () => {
    expect(
      getWarmableStaticEmojiUrls(
        [
          { static_url: '/system/custom_emojis/images/1/static/a.png' },
          {
            static_url:
              'https://mastodon.blue/system/custom_emojis/images/2/static/b.png',
          },
          {
            static_url:
              'https://cdn.example/system/custom_emojis/images/3/static/c.png',
          },
        ],
        origin,
      ),
    ).toEqual([
      'https://mastodon.blue/system/custom_emojis/images/1/static/a.png',
      'https://mastodon.blue/system/custom_emojis/images/2/static/b.png',
    ]);
  });

  test('deduplicates shared static thumbnail URLs', () => {
    expect(
      getWarmableStaticEmojiUrls(
        [
          { static_url: '/system/custom_emojis/images/1/static/a.png' },
          { static_url: '/system/custom_emojis/images/1/static/a.png' },
        ],
        origin,
      ),
    ).toEqual([
      'https://mastodon.blue/system/custom_emojis/images/1/static/a.png',
    ]);
  });

  test('ignores malformed static thumbnail URLs', () => {
    expect(
      getWarmableStaticEmojiUrls(
        [{ static_url: 'http://[invalid' }],
        origin,
      ),
    ).toEqual([]);
  });
});

describe('getStaleStaticEmojiCacheRequests', () => {
  test('returns only cached thumbnails that no longer belong to the catalog', () => {
    const active = new Request(
      'https://mastodon.blue/system/custom_emojis/images/1/static/a.png',
    );
    const removed = new Request(
      'https://mastodon.blue/system/custom_emojis/images/2/static/old.png',
    );

    expect(
      getStaleStaticEmojiCacheRequests(
        [active, removed],
        [active.url],
      ).map((request) => request.url),
    ).toEqual([removed.url]);
  });

  test('keeps the cache untouched when every cached thumbnail is current', () => {
    const first = new Request(
      'https://mastodon.blue/system/custom_emojis/images/1/static/a.png',
    );
    const second = new Request(
      'https://mastodon.blue/system/custom_emojis/images/2/static/b.png',
    );

    expect(
      getStaleStaticEmojiCacheRequests(
        [first, second],
        [first.url, second.url],
      ),
    ).toEqual([]);
  });
});
