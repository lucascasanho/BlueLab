import axios from 'axios';

import api from 'mastodon/api';
import type { ApiMediaAttachmentJSON } from 'mastodon/api_types/media_attachments';

const API_BASE = '/api/v1/blue/resumable_media_uploads';
const MAX_ATTEMPTS = 5;
const FINGERPRINT_SAMPLE_SIZE = 64 * 1024;
const STORAGE_PREFIX = 'mastodon.resumable-media-upload.';

export const shouldUseResumableMediaUpload = (
  fileSize: number,
  enabled: boolean,
  chunkSize: number,
): boolean => enabled && chunkSize > 0 && fileSize > chunkSize;

export const pendingResumableChunkIndexes = (
  chunkCount: number,
  uploadedChunks: Iterable<number>,
): number[] => {
  const uploaded = new Set(uploadedChunks);
  return Array.from({ length: chunkCount }, (_, index) => index).filter(
    (index) => !uploaded.has(index),
  );
};

export interface ResumableMediaUploadSession {
  id: string;
  state:
    | 'active'
    | 'finalizing'
    | 'completed'
    | 'failed'
    | 'canceled'
    | 'expired';
  expected_size: number;
  chunk_size: number;
  chunk_count: number;
  uploaded_bytes: number;
  uploaded_chunks: number[];
  expires_at: string;
  error?: string;
  media?: ApiMediaAttachmentJSON;
  media_processing: boolean;
}

interface CompletedResumableMediaUploadSession extends ResumableMediaUploadSession {
  state: 'completed';
  media: ApiMediaAttachmentJSON;
}

interface UploadCallbacks {
  onProgress: (loaded: number, total: number) => void;
  onProcessing: () => void;
  onSession: (id: string | undefined) => void;
}

const bytesToHex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

const sha256 = async (blob: Blob): Promise<string> => {
  const bytes = await blob.arrayBuffer();
  return bytesToHex(await crypto.subtle.digest('SHA-256', bytes));
};

const fingerprint = async (file: File): Promise<string> => {
  const first = file.slice(0, FINGERPRINT_SAMPLE_SIZE);
  const last = file.slice(
    Math.max(0, file.size - FINGERPRINT_SAMPLE_SIZE),
    file.size,
  );
  const metadata = new TextEncoder().encode(
    `${file.name}\0${file.size}\0${file.lastModified}\0${file.type}`,
  );
  const samples = new Blob([metadata, first, last]);
  return sha256(samples);
};

const storageKey = (fileFingerprint: string) =>
  `${STORAGE_PREFIX}${fileFingerprint}`;

const loadSessionId = (fileFingerprint: string): string | undefined => {
  try {
    return localStorage.getItem(storageKey(fileFingerprint)) ?? undefined;
  } catch {
    return undefined;
  }
};

const storeSessionId = (fileFingerprint: string, id: string) => {
  try {
    localStorage.setItem(storageKey(fileFingerprint), id);
  } catch {
    // Uploads remain resumable for the current page even without storage access.
  }
};

const removeSessionId = (fileFingerprint: string) => {
  try {
    localStorage.removeItem(storageKey(fileFingerprint));
  } catch {
    // Nothing else to clean up client-side.
  }
};

const delay = (milliseconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Upload canceled', 'AbortError'));
      return;
    }

    const timeout = window.setTimeout(resolve, milliseconds);
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException('Upload canceled', 'AbortError'));
      },
      { once: true },
    );
  });

export const shouldRetryResumableUpload = (error: unknown): boolean => {
  if (!axios.isAxiosError(error) || error.code === 'ERR_CANCELED') return false;
  if (!error.response) return true;

  return (
    [408, 425, 429].includes(error.response.status) ||
    error.response.status >= 500
  );
};

export const resumableUploadRetryDelay = (
  attempt: number,
  random = Math.random,
): number => {
  const base = Math.min(30_000, 1_000 * 2 ** (attempt - 1));
  return Math.round(base * (0.75 + random() * 0.5));
};

export const withResumableUploadRetry = async <T>(
  operation: (attempt: number) => Promise<T>,
  signal: AbortSignal,
  wait: (milliseconds: number, signal: AbortSignal) => Promise<void> = delay,
): Promise<T> => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt === MAX_ATTEMPTS || !shouldRetryResumableUpload(error)) {
        throw error;
      }
      await wait(resumableUploadRetryDelay(attempt), signal);
    }
  }

  throw new Error('Resumable upload retry limit reached');
};

const getSession = async (
  id: string,
  signal: AbortSignal,
): Promise<ResumableMediaUploadSession> => {
  const { data } = await api().get<ResumableMediaUploadSession>(
    `${API_BASE}/${id}`,
    { signal },
  );
  return data;
};

const resumeOrCreateSession = async (
  file: File,
  fileFingerprint: string,
  signal: AbortSignal,
): Promise<ResumableMediaUploadSession> => {
  const storedId = loadSessionId(fileFingerprint);

  if (storedId) {
    try {
      const stored = await getSession(storedId, signal);
      if (
        stored.expected_size === file.size &&
        ['active', 'finalizing', 'completed'].includes(stored.state)
      ) {
        return stored;
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED')
        throw error;
    }
    removeSessionId(fileFingerprint);
  }

  const { data } = await api().post<ResumableMediaUploadSession>(
    API_BASE,
    {
      filename: file.name,
      size: file.size,
      content_type: file.type,
    },
    { signal },
  );
  storeSessionId(fileFingerprint, data.id);
  return data;
};

const uploadChunk = async (
  session: ResumableMediaUploadSession,
  index: number,
  chunk: Blob,
  confirmedBytes: number,
  totalBytes: number,
  callbacks: UploadCallbacks,
  signal: AbortSignal,
) => {
  const checksum = await sha256(chunk);

  await withResumableUploadRetry(async (attempt) => {
    await api().put(`${API_BASE}/${session.id}/chunks/${index}`, chunk, {
      signal,
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Chunk-SHA256': checksum,
        'X-Upload-Attempt': attempt.toString(),
      },
      onUploadProgress: ({ loaded }) => {
        callbacks.onProgress(
          Math.min(totalBytes, confirmedBytes + loaded),
          totalBytes,
        );
      },
    });
  }, signal);
};

const waitForCompletion = async (
  session: ResumableMediaUploadSession,
  signal: AbortSignal,
): Promise<CompletedResumableMediaUploadSession> => {
  let current = session;
  let attempt = 1;

  while (current.state === 'finalizing') {
    await delay(Math.min(10_000, (Math.log2(attempt) || 1) * 1_000), signal);
    current = await getSession(current.id, signal);
    attempt += 1;
  }

  if (current.state !== 'completed' || !current.media) {
    throw new Error(current.error ?? 'Resumable media upload failed');
  }

  if (!current.media_processing) {
    return current as CompletedResumableMediaUploadSession;
  }

  const pollMedia = async (
    mediaId: string,
    mediaAttempt: number,
  ): Promise<ApiMediaAttachmentJSON> => {
    const response = await api().get<ApiMediaAttachmentJSON>(
      `/api/v1/media/${mediaId}`,
      { signal, validateStatus: (status) => [200, 206].includes(status) },
    );
    if (response.status === 200) return response.data;

    await delay(
      Math.min(10_000, (Math.log2(mediaAttempt) || 1) * 1_000),
      signal,
    );
    return pollMedia(mediaId, mediaAttempt + 1);
  };

  current.media = await pollMedia(current.media.id, 1);
  current.media_processing = false;
  return current as CompletedResumableMediaUploadSession;
};

export const uploadResumableMedia = async (
  file: File,
  callbacks: UploadCallbacks,
  signal: AbortSignal,
): Promise<ApiMediaAttachmentJSON> => {
  const fileFingerprint = await fingerprint(file);
  let session = await resumeOrCreateSession(file, fileFingerprint, signal);
  callbacks.onSession(session.id);

  try {
    if (session.state === 'active') {
      let confirmedBytes = session.uploaded_bytes;
      callbacks.onProgress(confirmedBytes, file.size);

      for (const index of pendingResumableChunkIndexes(
        session.chunk_count,
        session.uploaded_chunks,
      )) {
        const start = index * session.chunk_size;
        const end = Math.min(file.size, start + session.chunk_size);
        const chunk = file.slice(start, end);
        await uploadChunk(
          session,
          index,
          chunk,
          confirmedBytes,
          file.size,
          callbacks,
          signal,
        );
        confirmedBytes += chunk.size;
        callbacks.onProgress(confirmedBytes, file.size);
      }

      callbacks.onProcessing();
      const response = await api().post<ResumableMediaUploadSession>(
        `${API_BASE}/${session.id}/complete`,
        undefined,
        { signal },
      );
      session = response.data;
    } else if (session.state === 'finalizing') {
      callbacks.onProgress(file.size, file.size);
      callbacks.onProcessing();
    }

    const completedSession = await waitForCompletion(session, signal);
    removeSessionId(fileFingerprint);
    return completedSession.media;
  } finally {
    callbacks.onSession(undefined);
  }
};

export const cancelResumableMediaUpload = async (id: string) => {
  try {
    await api().delete(`${API_BASE}/${id}`);
  } catch (error) {
    if (
      !axios.isAxiosError(error) ||
      ![404, 409].includes(error.response?.status ?? 0)
    ) {
      throw error;
    }
  }
};
