import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';

import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';
import { GifIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';

import {
  addComposeThreadMedia,
  uploadCompose,
} from '@/mastodon/actions/compose';
import api from '@/mastodon/api';
import type { ApiMediaAttachmentJSON } from '@/mastodon/api_types/media_attachments';
import { IconButton } from '@/mastodon/components/button/redesign';
import { CircularProgress } from '@/mastodon/components/circular_progress';
import { MenuCard } from '@/mastodon/components/menu/card';
import type { PopoverChildProps } from '@/mastodon/components/popover';
import { Popover } from '@/mastodon/components/popover';
import { useToggle } from '@/mastodon/hooks/useToggle';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import classes from './gif_picker.module.scss';

const KLIPY_API_BASE = 'https://api.klipy.com/v2';
const KLIPY_ENV = import.meta.env as unknown as Record<string, unknown>;
const rawKlipyApiKey = KLIPY_ENV.VITE_KLIPY_API_KEY;
const KLIPY_API_KEY =
  typeof rawKlipyApiKey === 'string' ? rawKlipyApiKey.trim() : '';
const KLIPY_COUNTRY = 'BR';
const KLIPY_LOCALE = 'pt_BR';
const KLIPY_CONTENT_FILTER = 'high';
const KLIPY_LIMIT = 24;

const messages = defineMessages({
  button: {
    id: 'gif_button.label',
    defaultMessage: 'Insert GIF',
  },
  title: {
    id: 'gif_button.title',
    defaultMessage: 'GIFs',
  },
  search: {
    id: 'search.placeholder',
    defaultMessage: 'Search',
  },
  loading: {
    id: 'gif_button.loading',
    defaultMessage: 'Loading GIFs',
  },
  error: {
    id: 'gif_button.error',
    defaultMessage: 'Could not load GIFs. Try again.',
  },
  empty: {
    id: 'gif_button.empty',
    defaultMessage: 'No GIFs found.',
  },
  attribution: {
    id: 'gif_button.attribution',
    defaultMessage: 'Powered by KLIPY',
  },
  loadMore: {
    id: 'gif_button.load_more',
    defaultMessage: 'Load more',
  },
});

interface KlipyMediaFormat {
  url?: string;
  dims?: [number, number];
}

interface KlipyGif {
  id: string;
  title?: string;
  content_description?: string;
  media_formats?: {
    gif?: KlipyMediaFormat;
    tinygif?: KlipyMediaFormat;
  };
}

interface KlipyResponse {
  results?: KlipyGif[];
  next?: string;
}

export const ComposeGifButton: React.FC<{
  disabled?: boolean;
  activeThreadItemId?: string | null;
}> = ({ disabled = false, activeThreadItemId = null }) => {
  const [open, { onToggle, onFalse }] = useToggle();
  const [target, setTarget] = useState<HTMLButtonElement | null>(null);
  const [pickerThreadItemId, setPickerThreadItemId] = useState<
    string | null | undefined
  >(undefined);
  const pickerThreadItemIdRef = useRef<string | null | undefined>(undefined);

  const resolveFocusedThreadItemId = useCallback(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      const threadItem = activeElement.closest<HTMLElement>(
        '[data-thread-item-id]',
      );
      if (threadItem?.dataset.threadItemId) {
        return threadItem.dataset.threadItemId;
      }

      // A null target is intentional when the first post itself had focus.
      if (activeElement.closest('[data-compose-thread-main]')) {
        return null;
      }
    }

    return activeThreadItemId;
  }, [activeThreadItemId]);

  const handlePointerDown = useCallback(() => {
    const id = resolveFocusedThreadItemId();
    pickerThreadItemIdRef.current = id;
    setPickerThreadItemId(id);
  }, [resolveFocusedThreadItemId]);

  const handleToggle = useCallback(() => {
    if (open) {
      pickerThreadItemIdRef.current = undefined;
      setPickerThreadItemId(undefined);
    } else {
      const id =
        pickerThreadItemIdRef.current !== undefined
          ? pickerThreadItemIdRef.current
          : resolveFocusedThreadItemId();
      pickerThreadItemIdRef.current = id;
      setPickerThreadItemId(id);
    }

    onToggle();
  }, [onToggle, open, resolveFocusedThreadItemId]);

  const handleClose = useCallback(() => {
    pickerThreadItemIdRef.current = undefined;
    setPickerThreadItemId(undefined);
    onFalse();
  }, [onFalse]);

  const effectiveThreadItemId =
    pickerThreadItemId === undefined
      ? activeThreadItemId
      : pickerThreadItemId;

  const threadMedia = useAppSelector((state) => {
    if (!effectiveThreadItemId) return null;
    const item = (
      state.compose.get('thread_items') as ImmutableList<
        ImmutableMap<string, unknown>
      >
    ).find((candidate) => candidate.get('id') === effectiveThreadItemId);
    return (
      (item?.get('media_attachments') as
        | ImmutableList<ImmutableMap<string, unknown>>
        | undefined) ?? null
    );
  });
  const maxAttachments = useAppSelector(
    (state) =>
      state.server.server.item?.configuration.statuses.max_media_attachments ??
      4,
  );
  const disabledForThread =
    !!effectiveThreadItemId &&
    (!threadMedia || threadMedia.size >= maxAttachments);

  if (!KLIPY_API_KEY) {
    return null;
  }

  return (
    <>
      <IconButton
        size='sm'
        icon={GifIcon}
        ref={setTarget}
        disabled={disabled || disabledForThread}
        onPointerDown={handlePointerDown}
        onClick={handleToggle}
        aria-expanded={open}
      >
        <FormattedMessage id='gif_button.label' defaultMessage='Insert GIF' />
      </IconButton>

      <Popover
        isOpen={open}
        onClose={handleClose}
        reference={target}
        placement='top-start'
        offset={4}
        closeOnClickOutside
      >
        {({ props, placement }) => (
          <ComposeGifDropdown
            onClose={handleClose}
            activeThreadItemId={effectiveThreadItemId}
            className={placement}
            {...props}
          />
        )}
      </Popover>
    </>
  );
};

const ComposeGifDropdown: React.FC<
  {
    onClose: () => void;
    activeThreadItemId?: string | null;
    className?: string;
  } & PopoverChildProps
> = ({ onClose, activeThreadItemId = null, className, ...props }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const threadMedia = useAppSelector((state) => {
    if (!activeThreadItemId) return null;
    const item = (
      state.compose.get('thread_items') as ImmutableList<
        ImmutableMap<string, unknown>
      >
    ).find((candidate) => candidate.get('id') === activeThreadItemId);
    return (
      (item?.get('media_attachments') as
        | ImmutableList<ImmutableMap<string, unknown>>
        | undefined) ?? null
    );
  });
  const maxAttachments = useAppSelector(
    (state) =>
      state.server.server.item?.configuration.statuses.max_media_attachments ??
      4,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KlipyGif[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const load = useCallback(async (searchTerm: string, position?: string) => {
    if (!KLIPY_API_KEY) {
      setError(true);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const isMore = !!position;

    if (isMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(false);
    }

    try {
      const url = new URL(
        KLIPY_API_BASE + '/' + (searchTerm ? 'search' : 'featured'),
      );

      url.searchParams.set('key', KLIPY_API_KEY);
      url.searchParams.set('country', KLIPY_COUNTRY);
      url.searchParams.set('locale', KLIPY_LOCALE);
      url.searchParams.set('contentfilter', KLIPY_CONTENT_FILTER);
      url.searchParams.set('media_filter', 'gif,tinygif');
      url.searchParams.set('limit', String(KLIPY_LIMIT));

      if (searchTerm) {
        url.searchParams.set('q', searchTerm);
      }

      if (position) {
        url.searchParams.set('pos', position);
      }

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          'KLIPY request failed with status ' + String(response.status),
        );
      }

      const payload = (await response.json()) as KlipyResponse;
      const items = (payload.results ?? []).filter((item) => {
        const formats = item.media_formats;
        return Boolean(item.id && formats?.gif?.url && formats.tinygif?.url);
      });

      setResults((current) => (isMore ? [...current, ...items] : items));
      setNext(payload.next ?? null);
    } catch (loadError) {
      if (
        loadError instanceof DOMException &&
        loadError.name === 'AbortError'
      ) {
        return;
      }

      setError(true);
      if (!isMore) {
        setResults([]);
        setNext(null);
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(query.trim());
    }, 350);

    return () => {
      window.clearTimeout(timer);
      requestControllerRef.current?.abort();
    };
  }, [load, query]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const registerShare = useCallback(
    (id: string) => {
      if (!KLIPY_API_KEY) return;

      const url = new URL(KLIPY_API_BASE + '/registershare');
      url.searchParams.set('key', KLIPY_API_KEY);
      url.searchParams.set('id', id);
      url.searchParams.set('country', KLIPY_COUNTRY);
      url.searchParams.set('locale', KLIPY_LOCALE);

      if (query.trim()) {
        url.searchParams.set('q', query.trim());
      }

      void fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      }).catch(() => {
        // Analytics must not block the user's upload.
      });
    },
    [query],
  );

  const handleGifPick = useCallback(
    async (gif: KlipyGif) => {
      const mediaUrl = gif.media_formats?.gif?.url;
      if (!mediaUrl || selectingId) return;

      setSelectingId(gif.id);

      try {
        const response = await fetch(mediaUrl, {
          credentials: 'omit',
        });

        if (!response.ok) {
          throw new Error(
            'GIF download failed with status ' + String(response.status),
          );
        }

        const blob = await response.blob();
        const file = new File([blob], 'klipy-' + gif.id + '.gif', {
          type: blob.type || 'image/gif',
        });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        if (activeThreadItemId) {
          if (!threadMedia) {
            throw new Error('The selected thread item is no longer available');
          }
          if (threadMedia.size >= maxAttachments) {
            throw new Error('The selected thread item has no media slots left');
          }

          const form = new FormData();
          form.append('file', file);
          let uploadResponse = await api().post<ApiMediaAttachmentJSON>(
            '/api/v2/media',
            form,
          );
          while (uploadResponse.status !== 200) {
            await new Promise((resolve) => window.setTimeout(resolve, 1_000));
            uploadResponse = await api().get<ApiMediaAttachmentJSON>(
              `/api/v1/media/${uploadResponse.data.id}`,
            );
          }
          dispatch(
            addComposeThreadMedia(activeThreadItemId, uploadResponse.data),
          );
        } else {
          await dispatch(uploadCompose(dataTransfer.files));
        }

        registerShare(gif.id);
        onClose();
      } catch {
        setSelectingId(null);
        setError(true);
      }
    },
    [
      activeThreadItemId,
      dispatch,
      maxAttachments,
      onClose,
      registerShare,
      selectingId,
      threadMedia,
    ],
  );

  const createGifPickHandler = useCallback(
    (gif: KlipyGif) => () => {
      void handleGifPick(gif);
    },
    [handleGifPick],
  );

  const handleLoadMore = useCallback(() => {
    if (next) {
      void load(query.trim(), next);
    }
  }, [load, next, query]);

  const handleQueryChange = useCallback<
    React.ChangeEventHandler<HTMLInputElement>
  >((event) => {
    setQuery(event.target.value);
  }, []);

  return (
    <MenuCard
      {...props}
      className={classNames(classes.root, className)}
      role='dialog'
      aria-label={intl.formatMessage(messages.title)}
    >
      <div className={classes.header}>
        <div className={classes.titleRow}>
          <strong>
            <FormattedMessage id='gif_button.title' defaultMessage='GIFs' />
          </strong>
          <a
            href='https://klipy.com'
            target='_blank'
            rel='noreferrer'
            className={classes.attribution}
          >
            {intl.formatMessage(messages.attribution)}
          </a>
        </div>

        <div className={classes.search}>
          <MagnifyingGlassIcon aria-hidden='true' />
          <input
            ref={searchInputRef}
            type='search'
            value={query}
            placeholder={intl.formatMessage(messages.search)}
            aria-label={intl.formatMessage(messages.search)}
            onChange={handleQueryChange}
          />
        </div>
      </div>

      <div className={classes.content}>
        {loading && (
          <div className={classes.status}>
            <CircularProgress size={40} strokeWidth={2} role='status' />
            <span>{intl.formatMessage(messages.loading)}</span>
          </div>
        )}

        {!loading && error && (
          <div className={classes.status}>
            <span>{intl.formatMessage(messages.error)}</span>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className={classes.status}>
            <span>{intl.formatMessage(messages.empty)}</span>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className={classes.grid}>
            {results.map((gif) => {
              const previewUrl = gif.media_formats?.tinygif?.url;
              if (!previewUrl) return null;

              const dims = gif.media_formats?.tinygif?.dims ?? [220, 220];
              const title =
                [gif.content_description, gif.title].find((candidate) =>
                  candidate?.trim(),
                ) ?? 'GIF';

              return (
                <button
                  key={gif.id}
                  type='button'
                  className={classes.item}
                  disabled={!!selectingId}
                  onClick={createGifPickHandler(gif)}
                  aria-label={title}
                >
                  <img
                    src={previewUrl}
                    alt=''
                    width={dims[0]}
                    height={dims[1]}
                    loading='lazy'
                    decoding='async'
                  />
                  {selectingId === gif.id && (
                    <span className={classes.itemLoading}>
                      <CircularProgress
                        size={28}
                        strokeWidth={2}
                        role='status'
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {!loading && !error && next && (
          <button
            type='button'
            className={classes.loadMore}
            onClick={handleLoadMore}
            disabled={loadingMore || !!selectingId}
          >
            {loadingMore ? (
              <CircularProgress size={18} strokeWidth={2} role='status' />
            ) : (
              <FormattedMessage
                id='gif_button.load_more'
                defaultMessage='Load more'
              />
            )}
          </button>
        )}
      </div>
    </MenuCard>
  );
};
