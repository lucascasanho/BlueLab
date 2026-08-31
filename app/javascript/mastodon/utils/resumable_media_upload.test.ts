import {
  pendingResumableChunkIndexes,
  resumableUploadRetryDelay,
  shouldRetryResumableUpload,
  shouldUseResumableMediaUpload,
  withResumableUploadRetry,
} from './resumable_media_upload';

describe('resumable media uploads', () => {
  test('keeps small files on the traditional upload path', () => {
    expect(shouldUseResumableMediaUpload(64, true, 64)).toBe(false);
    expect(shouldUseResumableMediaUpload(65, true, 64)).toBe(true);
    expect(shouldUseResumableMediaUpload(128, false, 64)).toBe(false);
  });

  test('resumes by scheduling only chunks that are not on the server', () => {
    expect(pendingResumableChunkIndexes(5, [0, 2, 4])).toEqual([1, 3]);
  });

  test('uses bounded exponential backoff with jitter', () => {
    expect(resumableUploadRetryDelay(1, () => 0)).toBe(750);
    expect(resumableUploadRetryDelay(3, () => 0.5)).toBe(4_000);
    expect(resumableUploadRetryDelay(10, () => 1)).toBe(37_500);
  });

  test('retries transient failures without restarting successful work', async () => {
    const controller = new AbortController();
    const wait = vi.fn(() => Promise.resolve());
    const operation = vi
      .fn<(attempt: number) => Promise<string>>()
      .mockRejectedValueOnce({ isAxiosError: true })
      .mockResolvedValue('uploaded');

    await expect(
      withResumableUploadRetry(operation, controller.signal, wait),
    ).resolves.toBe('uploaded');

    expect(operation).toHaveBeenCalledTimes(2);
    expect(operation).toHaveBeenNthCalledWith(1, 1);
    expect(operation).toHaveBeenNthCalledWith(2, 2);
    expect(wait).toHaveBeenCalledOnce();
  });

  test('does not retry permanent HTTP failures or cancellation', () => {
    expect(
      shouldRetryResumableUpload({
        isAxiosError: true,
        response: { status: 422 },
      }),
    ).toBe(false);
    expect(
      shouldRetryResumableUpload({
        isAxiosError: true,
        code: 'ERR_CANCELED',
      }),
    ).toBe(false);
    expect(
      shouldRetryResumableUpload({
        isAxiosError: true,
        response: { status: 503 },
      }),
    ).toBe(true);
  });
});
