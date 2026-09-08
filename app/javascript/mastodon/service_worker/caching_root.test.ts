import { cacheRoot } from './caching';

describe('cacheRoot', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('removes a legacy authenticated root without fetching it again', async () => {
    const deleteRoot = vi.fn().mockResolvedValue(true);
    const open = vi.fn().mockResolvedValue({
      delete: deleteRoot,
    } as Partial<Cache>);
    const fetch = vi.fn();

    vi.stubGlobal('caches', { open });
    vi.stubGlobal('fetch', fetch);

    await cacheRoot();

    expect(open).toHaveBeenCalledWith('mastodon-web');
    expect(deleteRoot).toHaveBeenCalledWith('/');
    expect(fetch).not.toHaveBeenCalled();
  });
});
