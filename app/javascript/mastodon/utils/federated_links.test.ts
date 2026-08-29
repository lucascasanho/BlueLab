import type { ApiAccountJSON } from '@/mastodon/api_types/accounts';
import type { ApiSearchResultsJSON } from '@/mastodon/api_types/search';
import type { ApiStatusJSON } from '@/mastodon/api_types/statuses';

import {
  clearFederatedLinkCache,
  getFederatedRoute,
  getLocalUrlPath,
  handleFederatedLinkClick,
  isLikelyFederatedUrl,
  resolveFederatedLink,
} from './federated_links';

const emptyResults = {
  accounts: [],
  statuses: [],
  hashtags: [],
  collections: [],
} as unknown as ApiSearchResultsJSON;

const account = (acct = 'alice@remote.example') =>
  ({ id: '1', acct }) as ApiAccountJSON;
const status = (acct = 'alice@remote.example') =>
  ({
    id: '42',
    account: account(acct),
  }) as ApiStatusJSON;

const results = ({
  accounts = [],
  statuses = [],
}: {
  accounts?: ApiAccountJSON[];
  statuses?: ApiStatusJSON[];
} = {}) => ({
  ...emptyResults,
  accounts,
  statuses,
});

const click = (overrides = {}) => ({
  button: 0,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  preventDefault: vi.fn(),
  ...overrides,
});

const remoteStatusUrl = 'https://remote.example/@alice/123';

afterEach(() => {
  clearFederatedLinkCache();
});

describe('federated link routing', () => {
  test('builds a local route for a resolved remote status', () => {
    expect(getFederatedRoute(results({ statuses: [status()] }))).toBe(
      '/@alice@remote.example/42',
    );
  });

  test('builds a local route when only an account is returned', () => {
    expect(getFederatedRoute(results({ accounts: [account()] }))).toBe(
      '/@alice@remote.example',
    );
  });

  test('prefers a status when both a status and account are returned', () => {
    expect(
      getFederatedRoute(
        results({ accounts: [account()], statuses: [status()] }),
      ),
    ).toBe('/@alice@remote.example/42');
  });

  test('does not classify a normal external URL as federated', () => {
    expect(
      isLikelyFederatedUrl('https://www.wikipedia.org/wiki/Fediverse'),
    ).toBe(false);
  });

  test('recognizes common ActivityPub URL shapes', () => {
    expect(isLikelyFederatedUrl(remoteStatusUrl)).toBe(true);
    expect(isLikelyFederatedUrl('https://remote.example/@alice')).toBe(true);
    expect(
      isLikelyFederatedUrl('https://remote.example/users/alice/statuses/123'),
    ).toBe(true);
    expect(isLikelyFederatedUrl('https://remote.example/notes/abc123')).toBe(
      true,
    );
  });

  test('identifies links that already belong to Espelunca', () => {
    expect(
      getLocalUrlPath(
        'https://espelunca.social/@alice/42?x=1#thread',
        'https://espelunca.social',
      ),
    ).toBe('/@alice/42?x=1#thread');
    expect(
      isLikelyFederatedUrl(
        'https://espelunca.social/@alice/42',
        'https://espelunca.social',
      ),
    ).toBe(false);
  });

  test('deduplicates concurrent resolutions and caches the route', async () => {
    const resolver = vi
      .fn<() => Promise<ApiSearchResultsJSON>>()
      .mockResolvedValue(results({ statuses: [status()] }));

    const first = resolveFederatedLink(remoteStatusUrl, resolver);
    const second = resolveFederatedLink(remoteStatusUrl, resolver);

    await expect(Promise.all([first, second])).resolves.toEqual([
      '/@alice@remote.example/42',
      '/@alice@remote.example/42',
    ]);
    await expect(resolveFederatedLink(remoteStatusUrl, resolver)).resolves.toBe(
      '/@alice@remote.example/42',
    );
    expect(resolver).toHaveBeenCalledTimes(1);
  });
});

describe('federated link click handling', () => {
  const setup = (
    resolvedRoute: string | null = '/@alice@remote.example/42',
  ) => {
    const event = click();
    const resolve = vi.fn().mockResolvedValue(resolvedRoute);
    const navigateLocal = vi.fn();
    const navigateExternal = vi.fn();

    return { event, resolve, navigateLocal, navigateExternal };
  };

  test('navigates a normal click to the resolved local status', async () => {
    const options = setup();
    const handled = handleFederatedLinkClick({
      ...options,
      href: remoteStatusUrl,
    });

    await handled;
    expect(options.event.preventDefault).toHaveBeenCalledOnce();
    expect(options.navigateLocal).toHaveBeenCalledWith(
      '/@alice@remote.example/42',
    );
    expect(options.navigateExternal).not.toHaveBeenCalled();
  });

  test.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['middle button', { button: 1 }],
  ])('preserves a %s click', (_name, modifiers) => {
    const options = setup();
    options.event = click(modifiers);

    const handled = handleFederatedLinkClick({
      ...options,
      href: remoteStatusUrl,
    });

    expect(handled).toBeNull();
    expect(options.event.preventDefault).not.toHaveBeenCalled();
    expect(options.resolve).not.toHaveBeenCalled();
  });

  test('leaves ordinary external links untouched', () => {
    const options = setup();
    const handled = handleFederatedLinkClick({
      ...options,
      href: 'https://www.wikipedia.org/wiki/Fediverse',
    });

    expect(handled).toBeNull();
    expect(options.event.preventDefault).not.toHaveBeenCalled();
    expect(options.resolve).not.toHaveBeenCalled();
  });

  test('falls back to the canonical URL when no object is resolved', async () => {
    const options = setup(null);

    await handleFederatedLinkClick({ ...options, href: remoteStatusUrl });
    expect(options.navigateExternal).toHaveBeenCalledWith(remoteStatusUrl);
  });

  test.each(['network error', 'timeout'])(
    'falls back after a %s',
    async (reason) => {
      const options = setup();
      options.resolve.mockRejectedValueOnce(new Error(reason));

      await handleFederatedLinkClick({ ...options, href: remoteStatusUrl });
      expect(options.navigateExternal).toHaveBeenCalledWith(remoteStatusUrl);
      expect(options.navigateLocal).not.toHaveBeenCalled();
    },
  );
});
