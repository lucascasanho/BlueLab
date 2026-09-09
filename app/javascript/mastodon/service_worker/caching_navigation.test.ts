import {
  handleFetch,
  isSafeNavigationRequest,
  OFFLINE_SHELL_CACHE_KEY,
} from './caching';

const origin = self.location.origin;

function createNavigationRequest(path: string, requestOrigin = origin) {
  const request = new Request(`${requestOrigin}${path}`, { method: 'GET' });
  Object.defineProperty(request, 'mode', { value: 'navigate' });
  return request;
}

function createFetchEvent(request: Request) {
  let responsePromise: Promise<Response> | undefined;
  const respondWithMock = vi.fn(
    (response: Response | PromiseLike<Response>) => {
      responsePromise = Promise.resolve(response);
    },
  );

  const event = {
    request,
    respondWith: respondWithMock,
    waitUntil: vi.fn(),
  } as unknown as FetchEvent;

  return {
    event,
    respondWithMock,
    response: () => responsePromise,
  };
}

describe('isSafeNavigationRequest', () => {
  test('accepts same-origin GET document navigations', () => {
    expect(
      isSafeNavigationRequest(createNavigationRequest('/home'), origin),
    ).toBe(true);
  });

  test.each([
    '/auth/sign_in',
    '/oauth/authorize',
    '/admin/accounts',
    '/settings/profile',
    '/api/v1/timelines/home',
    '/.well-known/webfinger',
    '/users/example',
    '/sw.js',
  ])('excludes sensitive or protocol navigation %s', (path) => {
    expect(isSafeNavigationRequest(createNavigationRequest(path), origin)).toBe(
      false,
    );
  });

  test('rejects cross-origin navigations', () => {
    expect(
      isSafeNavigationRequest(
        createNavigationRequest('/home', 'https://example.com'),
        origin,
      ),
    ).toBe(false);
  });
});

describe('offline navigation fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('returns the live network response when navigation succeeds', async () => {
    const request = createNavigationRequest('/home');
    const networkResponse = new Response('online', { status: 200 });
    const fetch = vi.fn().mockResolvedValue(networkResponse);
    const open = vi.fn();

    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('caches', { open });

    const { event, response } = createFetchEvent(request);
    handleFetch(event);

    await expect(response()).resolves.toBe(networkResponse);
    expect(fetch).toHaveBeenCalledWith(request);
    expect(open).not.toHaveBeenCalled();
  });

  test('serves the sanitized shell only when a safe navigation network request rejects', async () => {
    const request = createNavigationRequest('/home');
    const shell = new Response('offline shell', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
    const match = vi.fn().mockResolvedValue(shell);
    const open = vi.fn().mockResolvedValue({ match });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    vi.stubGlobal('caches', { open });

    const { event, response } = createFetchEvent(request);
    handleFetch(event);

    await expect(response()).resolves.toBe(shell);
    expect(open).toHaveBeenCalledWith('mastodon-web');
    expect(match).toHaveBeenCalledWith(OFFLINE_SHELL_CACHE_KEY);
  });

  test('does not replace an HTTP server error with the offline shell', async () => {
    const request = createNavigationRequest('/home');
    const serverError = new Response('server error', { status: 503 });
    const open = vi.fn();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(serverError));
    vi.stubGlobal('caches', { open });

    const { event, response } = createFetchEvent(request);
    handleFetch(event);

    await expect(response()).resolves.toBe(serverError);
    expect(open).not.toHaveBeenCalled();
  });

  test('does not intercept excluded authentication navigations', () => {
    const request = createNavigationRequest('/auth/sign_in');
    vi.stubGlobal('fetch', vi.fn());

    const { event, respondWithMock, response } = createFetchEvent(request);
    handleFetch(event);

    expect(respondWithMock).not.toHaveBeenCalled();
    expect(response()).toBeUndefined();
  });
});
