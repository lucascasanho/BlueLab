import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';

import { GifIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';

import { uploadCompose } from '@/mastodon/actions/compose';
import { IconButton } from '@/mastodon/components/button/redesign';
import { CircularProgress } from '@/mastodon/components/circular_progress';
import { MenuCard } from '@/mastodon/components/menu/card';
import type { PopoverChildProps } from '@/mastodon/components/popover';
import { Popover } from '@/mastodon/components/popover';
import { useToggle } from '@/mastodon/hooks/useToggle';
import { useAppDispatch } from '@/mastodon/store';

import classes from './gif_picker.module.scss';

const KLIPY_API_BASE = 'https://api.klipy.com/v2';
const KLIPY_API_KEY = import.meta.env.VITE_KLIPY_API_KEY?.trim();
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
    id: 'gif_button.search',
    defaultMessage: 'Search KLIPY',
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
}> = ({ disabled = false }) => {
  const [open, { onToggle, onFalse }] = useToggle();
  const [target, setTarget] = useState<HTMLButtonElement | null>(null);

  if (!KLIPY_API_KEY) {
    return null;
  }

  return (
    <>
      <IconButton
        size='sm'
        icon={GifIcon}
        ref={setTarget}
        disabled={disabled}
        onClick={onToggle}
        aria-expanded={open}
      >
        <FormattedMessage
          id={messages.button.id}
          defaultMessage={messages.button.defaultMessage}
        />
      </IconButton>

      <Popover
        isOpen={open}
        onClose={onFalse}
        reference={target}
        placement='top-start'
        offset={4}
        closeOnClickOutside
      >
        {({ props, placement }) => (
          <ComposeGifDropdown
            onClose={onFalse}
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
    className?: string;
  } & PopoverChildProps
> = ({ onClose, className, ...props }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KlipyGif[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const load = useCallback(
    async (searchTerm: string, position?: string) => {
      if (!KLIPY_API_KEY) return;

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
        const items = (payload.results ?? []).filter(
          (item) =>
            item.id &&
            !!item.media_formats?.gif?.url &&
            !!item.media_formats?.tinygif?.url,
        );

        setResults((current) => (isMore ? [...current, ...items] : items));
        setNext(payload.next || null);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
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
        }
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

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

        dispatch(uploadCompose(dataTransfer.files));
        registerShare(gif.id);
        onClose();
      } catch {
        setSelectingId(null);
        setError(true);
      }
    },
    [dispatch, onClose, registerShare, selectingId],
  );

  const handleLoadMore = useCallback(() => {
    if (next) {
      void load(query.trim(), next);
    }
  }, [load, next, query]);

  return (
    <MenuCard
      {...props}
      className={classNames(classes.root, className)}
      role='dialog'
      aria-label={intl.formatMessage(messages.title)}
    >
      <div className={classes.header}>
        <div className={classes.titleRow}>
          <GifIcon aria-hidden='true' />
          <strong>
            <FormattedMessage
              id={messages.title.id}
              defaultMessage={messages.title.defaultMessage}
            />
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
            onChange={(event) => setQuery(event.target.value)}
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
              const title = gif.content_description || gif.title || 'GIF';

              return (
                <button
                  key={gif.id}
                  type='button'
                  className={classes.item}
                  disabled={!!selectingId}
                  onClick={() => void handleGifPick(gif)}
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
                id={messages.loadMore.id}
                defaultMessage={messages.loadMore.defaultMessage}
              />
            )}
          </button>
        )}
      </div>
    </MenuCard>
  );
};
