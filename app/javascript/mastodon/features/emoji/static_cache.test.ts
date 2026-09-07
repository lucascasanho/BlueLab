import { isStandalonePwa } from './static_cache';

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
