/* eslint-disable react/jsx-no-bind, @typescript-eslint/no-confusing-void-expression -- Thread rows require handlers bound to their persistent item and media IDs. */
import { useCallback, useEffect, useRef } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';

import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';

import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';

import {
  addComposeThreadMedia,
  changeComposeThreadItem,
  removeComposeThreadItem,
  removeComposeThreadMedia,
} from '@/mastodon/actions/compose';
import { openModal } from '@/mastodon/actions/modal';
import api from '@/mastodon/api';
import type { ApiMediaAttachmentJSON } from '@/mastodon/api_types/media_attachments';
import { Button, IconButton } from '@/mastodon/components/button/redesign';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import CloseIcon from '@/material-icons/400-20px/close.svg?react';

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
  addAlt: {
    id: 'compose.thread.add_alt',
    defaultMessage: 'Add alt text',
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
          const itemSelector = `[data-thread-item-id="${id}"]`;
          document
            .querySelector<HTMLElement>(
              `${itemSelector} [data-compose-scroll-zone='editor']`,
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

  return (
    <section
      className={classNames(
        classes.threadItem,
        active && classes.threadItemActive,
      )}
      data-thread-item-id={id}
      onFocusCapture={onFocus}
    >
      <div className={classes.threadIndicator} aria-hidden='true' />
      <IconButton
        as='button'
        type='button'
        size='sm'
        icon={CloseIcon}
        className={classes.threadItemRemove}
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
            hideFormattingToolbar
            dismissOnEscape={false}
          />
        </ComposeAutocomplete>
        {media.size > 0 && (
          <div className={classes.threadMedia}>
            {media.map((attachment) => {
              const mediaId = attachment.get('id') as string;
              return (
                <ThreadMediaAttachment
                  key={mediaId}
                  attachment={attachment}
                  threadItemId={id}
                  onRemove={() =>
                    dispatch(removeComposeThreadMedia(id, mediaId))
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

const ThreadMediaAttachment: React.FC<{
  attachment: ImmutableMap<string, unknown>;
  threadItemId: string;
  onRemove: () => void;
}> = ({ attachment, threadItemId, onRemove }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const mediaId = attachment.get('id') as string;
  const type = attachment.get('type') as string | undefined;
  const previewUrl = attachment.get('preview_url') as string | null;
  const mediaUrl = attachment.get('url') as string | null;
  const isVideo = type === 'video';
  const isAnimatedGif = type === 'gifv';
  const isAudio = type === 'audio';

  const handleEditAlt = useCallback(() => {
    dispatch(
      openModal({
        modalType: 'FOCAL_POINT',
        modalProps: { mediaId, threadItemId },
      }),
    );
  }, [dispatch, mediaId, threadItemId]);

  return (
    <div className={classes.threadMediaItem}>
      <div className={classes.mediaPreview} data-media-type={type ?? 'image'}>
        {isVideo ? (
          <video
            className={classes.mediaVideo}
            src={mediaUrl ?? undefined}
            poster={previewUrl ?? undefined}
            controls
            playsInline
            preload='metadata'
          />
        ) : isAnimatedGif ? (
          <video
            className={classes.mediaVideo}
            src={mediaUrl ?? undefined}
            poster={previewUrl ?? undefined}
            autoPlay
            loop
            muted
            playsInline
            preload='metadata'
            aria-hidden='true'
          />
        ) : isAudio && mediaUrl ? (
          <div className={classes.mediaAudioPreview}>
            {previewUrl ? (
              <img className={classes.mediaImage} src={previewUrl} alt='' />
            ) : (
              <div
                className={classes.mediaAudioPlaceholder}
                aria-hidden='true'
              />
            )}
            <audio
              className={classes.mediaAudio}
              src={mediaUrl}
              controls
              preload='metadata'
            />
          </div>
        ) : (
          <img
            className={classes.mediaImage}
            src={previewUrl ?? mediaUrl ?? undefined}
            alt=''
          />
        )}

        <div className={classes.mediaActions}>
          <Button
            as='button'
            type='button'
            size='sm'
            variant='solid'
            leadingIcon={PencilSimpleIcon}
            className={classNames(
              classes.mediaActionButton,
              classes.mediaAltButton,
            )}
            onClick={handleEditAlt}
            aria-label={intl.formatMessage(messages.addAlt)}
          >
            <span aria-hidden='true'>ALT</span>
            <span className='sr-only'>
              <FormattedMessage {...messages.addAlt} />
            </span>
          </Button>
          <IconButton
            as='button'
            type='button'
            size='sm'
            variant='solid'
            icon={TrashIcon}
            className={classNames(
              classes.mediaActionButton,
              classes.mediaRemove,
            )}
            onClick={onRemove}
            aria-label={intl.formatMessage(messages.removeMedia)}
          >
            <span className='sr-only'>
              <FormattedMessage {...messages.removeMedia} />
            </span>
          </IconButton>
        </div>
      </div>
    </div>
  );
};
