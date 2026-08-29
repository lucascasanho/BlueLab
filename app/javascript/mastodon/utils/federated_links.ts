import type { ApiSearchResultsJSON } from '@/mastodon/api_types/search';

const MAX_CACHE_SIZE = 100;

const resolvedRoutes = new Map<string, string | null>();
const pendingResolutions = new Map<string, Promise<string | null>>();

const FEDERATED_PATHS = [
  /^\/@[^/]+(?:\/\d+)?\/?$/u,
  /^\/(?:users|accounts|profile)\/[^/]+(?:\/(?:statuses|notes|posts)\/[^/]+)?\/?$/u,
  /^\/(?:notice|objects|notes|posts)\/[^/]+\/?$/u,
  /^\/p\/[^/]+\/[^/]+\/?$/u,
  /^\/(?:w|videos\/watch)\/[^/]+\/?$/u,
];

const currentOrigin = () =>
  typeof window === 'undefined' ? undefined : window.location.origin;

export const getLocalUrlPath = (
  href: string,
  localOrigin = currentOrigin(),
) => {
  if (!localOrigin) {
    return null;
  }

  try {
    const url = new URL(href);
    return url.origin === localOrigin
      ? `${url.pathname}${url.search}${url.hash}`
      : null;
  } catch {
    return null;
  }
};

export const isLikelyFederatedUrl = (
  href: string,
  localOrigin = currentOrigin(),
) => {
  try {
    const url = new URL(href);

    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.origin !== localOrigin &&
      FEDERATED_PATHS.some((pattern) => pattern.test(url.pathname))
    );
  } catch {
    return false;
  }
};

export const getFederatedRoute = (results: ApiSearchResultsJSON) => {
  const status = results.statuses[0];
  if (status) {
    return `/@${status.account.acct}/${status.id}`;
  }

  const account = results.accounts[0];
  if (account) {
    return `/@${account.acct}`;
  }

  return null;
};

export const resolveFederatedLink = async (
  url: string,
  resolver: () => Promise<ApiSearchResultsJSON>,
) => {
  if (resolvedRoutes.has(url)) {
    return resolvedRoutes.get(url) ?? null;
  }

  const pending = pendingResolutions.get(url);
  if (pending) {
    return pending;
  }

  const resolution = resolver()
    .then((results) => {
      const route = getFederatedRoute(results);

      if (resolvedRoutes.size >= MAX_CACHE_SIZE) {
        const oldest = resolvedRoutes.keys().next().value;
        if (oldest) resolvedRoutes.delete(oldest);
      }

      resolvedRoutes.set(url, route);
      return route;
    })
    .finally(() => pendingResolutions.delete(url));

  pendingResolutions.set(url, resolution);
  return resolution;
};

interface FederatedLinkClick {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
}

export const handleFederatedLinkClick = ({
  event,
  href,
  resolve,
  navigateLocal,
  navigateExternal,
}: {
  event: FederatedLinkClick;
  href: string;
  resolve: (url: string) => Promise<string | null>;
  navigateLocal: (path: string) => void;
  navigateExternal: (url: string) => void;
}) => {
  if (
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey ||
    !isLikelyFederatedUrl(href)
  ) {
    return null;
  }

  event.preventDefault();

  return resolve(href)
    .then((route) => {
      if (route) {
        navigateLocal(route);
      } else {
        navigateExternal(href);
      }
    })
    .catch(() => {
      navigateExternal(href);
    });
};

export const clearFederatedLinkCache = () => {
  resolvedRoutes.clear();
  pendingResolutions.clear();
};
