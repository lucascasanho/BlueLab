/* eslint-disable react/jsx-no-bind, @typescript-eslint/no-confusing-void-expression -- Thread rows require handlers bound to their persistent item and media IDs. */
import { useCallback, useEffect, useRef } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';
import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';

import { XIcon } from '@phosphor-icons/react';

import {
  addComposeThreadMedia,
  changeComposeThreadItem,
  removeComposeThreadItem,
  removeComposeThreadMedia,
} from '@/mastodon/actions/compose';
import api from '@/mastodon/api';
import type { ApiMediaAttachmentJSON } from '@/mastodon/api_types/media_attachments';
import { IconButton } from '@/mastodon/components/button/redesign';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import { ComposeAutocomplete } from './autocomplete';
import { RichComposeEditor } from './rich_editor';
import classes from './thread.module.scss';

const messages = defineMessages({
  remove: {
    id: 'compose.thread.remove',
    defaultMessage: 'Remove post from thread',
  },
  removeMedia: {
    id: 'compose.thread.remove_media',
    defaultMessage: 'Remove media',
  },
});

type ThreadItem = ImmutableMap<string, unknown>;

export const ComposeThreadItems: React.FC<{
  onSubmit: (event?: React.SubmitEvent) => void;
  activeItemId: string | null;
  onFocusItem: (id: string | null) => void;
}> = ({ onSubmit, activeItemId, onFocusItem }) => {
  const items = useAppSelector(
    (state) => state.compose.get('thread_items') as ImmutableList<ThreadItem>,
  );
  const hasPublishedItems = useAppSelector(
    (state) =>
      !(
        state.compose.get('thread_published_ids') as unknown as {
          isEmpty: () => boolean;
        }
      ).isEmpty(),
  );
  const previousSize = useRef(0);

  useEffect(() => {
    if (items.size > previousSize.current) {
      const item = items.last();
      const id = item?.get('id') as string | undefined;
      if (id) {
        onFocusItem(id);
        window.requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(
              `[data-thread-item-id="${id}"] [data-compose-scroll-zone='editor']`,
            )
            ?.focus();
        });
      }
    }
    previousSize.current = items.size;
  }, [items, onFocusItem]);

  if (items.isEmpty()) return null;

  return (
    <div className={classes.threadItems} aria-label='Thread posts'>
      {items.map((item) => {
        const id = item.get('id') as string;
        return (
          <ComposeThreadItem
            key={id}
            item={item}
            active={activeItemId === id}
            removalDisabled={hasPublishedItems}
            onFocus={() => onFocusItem(id)}
            onRemoved={() => {
              if (activeItemId === id) onFocusItem(null);
            }}
            onSubmit={onSubmit}
          />
        );
      })}
    </div>
  );
};

const ComposeThreadItem: React.FC<{
  item: ThreadItem;
  active: boolean;
  removalDisabled: boolean;
  onFocus: () => void;
  onRemoved: () => void;
  onSubmit: (event?: React.SubmitEvent) => void;
}> = ({ item, active, removalDisabled, onFocus, onRemoved, onSubmit }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const id = item.get('id') as string;
  const text = item.get('text') as string;
  const contentType = item.get('content_type') as string;
  const media = item.get('media_attachments') as ImmutableList<
    ImmutableMap<string, unknown>
  >;
  const maximumMedia = useAppSelector(
    (state) =>
      state.server.server.item?.configuration.statuses.max_media_attachments ??
      4,
  );

  const change = useCallback(
    (field: string, value: unknown) =>
      dispatch(changeComposeThreadItem(id, field, value)),
    [dispatch, id],
  );

  const upload = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files).slice(
        0,
        Math.max(0, maximumMedia - media.size),
      )) {
        const form = new FormData();
        form.append('file', file);
        let response = await api().post<ApiMediaAttachmentJSON>(
          '/api/v2/media',
          form,
        );
        while (response.status !== 200) {
          await new Promise((resolve) => window.setTimeout(resolve, 1_000));
          response = await api().get<ApiMediaAttachmentJSON>(
            `/api/v1/media/${response.data.id}`,
          );
        }
        dispatch(addComposeThreadMedia(id, response.data));
      }
    },
    [dispatch, id, maximumMedia, media.size],
  );

  const updateAlt = useCallback(
    (mediaId: string, description: string) => {
      const updated = media.map((attachment) =>
        attachment.get('id') === mediaId
          ? attachment.set('description', description)
          : attachment,
      );
      change('media_attachments', updated);
    },
    [change, media],
  );

  return (
    <section
      className={classNames(
        classes.threadItem,
        active && classes.threadItemActive,
      )}
      data-thread-item-id={id}
      onFocusCapture={onFocus}
    >
      <IconButton
        as='button'
        type='button'
        size='sm'
        icon={XIcon}
        className={classes.threadItemRemove}
        title={intl.formatMessage(messages.remove)}
        disabled={removalDisabled}
        onClick={() => {
          dispatch(removeComposeThreadItem(id));
          onRemoved();
        }}
      >
        <FormattedMessage {...messages.remove} />
      </IconButton>

      <div className={classes.threadEditor}>
        <ComposeAutocomplete>
          <RichComposeEditor
            value={text}
            contentType={contentType}
            editorId={`composer-thread-${id}`}
            onChange={(value) => change('text', value)}
            onContentTypeChange={(value) => change('content_type', value)}
            onFiles={(files) => void upload(files)}
            onSubmit={onSubmit}
            dismissOnEscape={false}
          />
        </ComposeAutocomplete>
      </div>

      {media.size > 0 && (
        <div className={classes.threadMedia}>
          {media.map((attachment) => {
            const mediaId = attachment.get('id') as string;
            return (
              <div key={mediaId} className={classes.threadMediaItem}>
                <img src={attachment.get('preview_url') as string} alt='' />
                <IconButton
                  as='button'
                  type='button'
                  size='sm'
                  icon={XIcon}
                  className={classes.mediaRemove}
                  title={intl.formatMessage(messages.removeMedia)}
                  onClick={() =>
                    dispatch(removeComposeThreadMedia(id, mediaId))
                  }
                >
                  <FormattedMessage {...messages.removeMedia} />
                </IconButton>
                <label className={classes.mediaAlt}>
                  <span className='sr-only'>
                    <FormattedMessage
                      id='compose.thread.alt'
                      defaultMessage='Alternative text'
                    />
                  </span>
                  <input
                    value={
                      (attachment.get('description') as string | undefined) ??
                      ''
                    }
                    placeholder={intl.formatMessage({
                      id: 'compose.thread.alt',
                      defaultMessage: 'Alternative text',
                    })}
                    onChange={(event) => updateAlt(mediaId, event.target.value)}
                    onBlur={() =>
                      void api().put(`/api/v1/media/${mediaId}`, {
                        description: attachment.get('description') ?? '',
                      })
                    }
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
