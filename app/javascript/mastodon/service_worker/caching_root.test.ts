import {
  cacheRoot,
  createOfflineShellResponse,
  OFFLINE_SHELL_CACHE_KEY,
} from './caching';

describe('cacheRoot', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('removes a legacy authenticated root without fetching it again', async () => {
    const deleteRoot = vi.fn().mockResolvedValue(true);
    const put = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn().mockResolvedValue({
      delete: deleteRoot,
      put,
    } as Partial<Cache>);
    const fetch = vi.fn();

    vi.stubGlobal('caches', { open });
    vi.stubGlobal('fetch', fetch);

    await cacheRoot();

    expect(open).toHaveBeenCalledWith('mastodon-web');
    expect(deleteRoot).toHaveBeenCalledWith('/');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('stores only the synthetic offline shell in the web cache', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn().mockResolvedValue({
      delete: vi.fn().mockResolvedValue(true),
      put,
    } as Partial<Cache>);

    vi.stubGlobal('caches', { open });
    vi.stubGlobal('fetch', vi.fn());

    await cacheRoot();

    expect(put).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledWith(
      OFFLINE_SHELL_CACHE_KEY,
      expect.any(Response),
    );

    const response = put.mock.calls[0]?.[1] as Response;
    expect(response.headers.get('Content-Type')).toBe(
      'text/html; charset=utf-8',
    );
    expect(response.headers.get('Content-Security-Policy')).toContain(
      "default-src 'none'",
    );

    const html = await response.clone().text();
    expect(html).toContain('<main');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/csrf|access[_-]?token|authorization/i);
  });
});

describe('createOfflineShellResponse', () => {
  test('uses Portuguese copy for Portuguese browser locales', async () => {
    const response = createOfflineShellResponse('pt-BR');
    const html = await response.text();

    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain('Sem conexão com o servidor');
  });

  test('falls back to English for other browser locales', async () => {
    const response = createOfflineShellResponse('fr-FR');
    const html = await response.text();

    expect(html).toContain('lang="en"');
    expect(html).toContain('Unable to reach the server');
  });
});
