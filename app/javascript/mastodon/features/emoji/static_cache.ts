type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

type MatchMedia = (
  query: string,
) => Pick<MediaQueryList, 'matches'>;

interface StandaloneEnvironment {
  matchMedia?: MatchMedia;
  navigatorObject?: Pick<StandaloneNavigator, 'standalone'>;
}

/**
 * Returns whether the current Mastodon window is running as an installed app.
 *
 * `display-mode: standalone` covers modern Chromium and WebKit PWAs. The
 * `navigator.standalone` fallback keeps compatibility with older iOS Home
 * Screen web apps without relying on user-agent sniffing or installability
 * events.
 */
export function isStandalonePwa(
  environment: StandaloneEnvironment = {},
): boolean {
  const matchMedia =
    environment.matchMedia ??
    (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia.bind(window)
      : undefined);
  const navigatorObject =
    environment.navigatorObject ??
    (typeof navigator !== 'undefined'
      ? (navigator as StandaloneNavigator)
      : undefined);

  return (
    matchMedia?.('(display-mode: standalone)').matches === true ||
    navigatorObject?.standalone === true
  );
}
