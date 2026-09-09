/* eslint-disable react/jsx-no-bind, @typescript-eslint/no-confusing-void-expression -- Thread rows require handlers bound to their persistent item and media IDs. */
import { useCallback, useRef, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';

import {
  ImageSquareIcon,
  MarkdownLogoIcon,
  TrashIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import type { EmojiData } from 'emoji-mart';
import { length } from 'stringz';

import {
  addComposeThreadMedia,
  changeComposeThreadItem,
  removeComposeThreadItem,
  removeComposeThreadMedia,
} from '@/mastodon/actions/compose';
import api from '@/mastodon/api';
import type { ApiMediaAttachmentJSON } from '@/mastodon/api_types/media_attachments';
import type { StatusVisibility } from '@/mastodon/api_types/statuses';
import { IconButton } from '@/mastodon/components/button/redesign';
import { statusMaxCharacters } from '@/mastodon/initial_state';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import { countableText } from '../util/counter';

import { ComposeAutocomplete } from './autocomplete';
import { ComposeEmojiButton } from './emoji';
import { RichComposeEditor } from './rich_editor';
import classes from './styles.module.scss';

const messages = defineMessages({
  remove: {
    id: 'compose.thread.remove',
    defaultMessage: 'Remove post from thread',
  },
  media: {
    id: 'compose.thread.media',
    defaultMessage: 'Add media to this post',
  },
});

type ThreadItem = ImmutableMap<string, unknown>;

export const ComposeThreadItems: React.FC<{
  onSubmit: (event?: React.SubmitEvent) => void;
}> = ({ onSubmit }) => {
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

  if (items.isEmpty()) return null;

  return (
    <div className={classes.threadItems} aria-label='Thread posts'>
      {items.map((item, index) => (
        <ComposeThreadItem
          key={item.get('id') as string}
          item={item}
          index={index + 1}
          total={items.size + 1}
          removalDisabled={hasPublishedItems}
          onSubmit={onSubmit}
        />
      ))}
    </div>
  );
};

const ComposeThreadItem: React.FC<{
  item: ThreadItem;
  index: number;
  total: number;
  removalDisabled: boolean;
  onSubmit: (event?: React.SubmitEvent) => void;
}> = ({ item, index, total, removalDisabled, onSubmit }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const id = item.get('id') as string;
  const text = item.get('text') as string;
  const spoilerText = item.get('spoiler_text') as string;
  const contentType = item.get('content_type') as string;
  const visibility = item.get('visibility') as StatusVisibility;
  const language = item.get('language') as string;
  const media = item.get('media_attachments') as ImmutableList<
    ImmutableMap<string, unknown>
  >;
  const maximum = useAppSelector(
    (state) =>
      state.server.server.item?.configuration.statuses.max_characters ??
      statusMaxCharacters ??
      500,
  );
  const maximumMedia = useAppSelector(
    (state) =>
      state.server.server.item?.configuration.statuses.max_media_attachments ??
      4,
  );
  const current = length(`${countableText(text)}${spoilerText}`);

  const change = useCallback(
    (field: string, value: unknown) =>
      dispatch(changeComposeThreadItem(id, field, value)),
    [dispatch, id],
  );

  const upload = useCallback(
    async (files: FileList) => {
      setUploading(true);
      try {
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
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [dispatch, id, maximumMedia, media.size],
  );

  const insertEmoji = useCallback(
    (emoji: EmojiData) => {
      const value =
        'native' in emoji && emoji.native ? emoji.native : `:${emoji.id}:`;
      change('text', `${text}${value}`);
    },
    [change, text],
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
    <section className={classes.threadItem} data-thread-item-index={index}>
      <header className={classes.threadItemHeader}>
        <strong>
          <FormattedMessage
            id='compose.thread.position'
            defaultMessage='Post {position} of {total}'
            values={{ position: index + 1, total }}
          />
        </strong>
        <IconButton
          size='sm'
          icon={TrashIcon}
          color='destructive'
          title={intl.formatMessage(messages.remove)}
          disabled={removalDisabled}
          onClick={() => dispatch(removeComposeThreadItem(id))}
        >
          <FormattedMessage {...messages.remove} />
        </IconButton>
      </header>
      <label className={classes.threadField}>
        <span>
          <FormattedMessage
            id='compose.thread.cw'
            defaultMessage='Content warning (optional)'
          />
        </span>
        <input
          value={spoilerText}
          onChange={(event) => change('spoiler_text', event.target.value)}
        />
      </label>
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
      {media.size > 0 && (
        <div className={classes.threadMedia}>
          {media.map((attachment) => {
            const mediaId = attachment.get('id') as string;
            return (
              <div key={mediaId} className={classes.threadMediaItem}>
                <img src={attachment.get('preview_url') as string} alt='' />
                <label>
                  <FormattedMessage
                    id='compose.thread.alt'
                    defaultMessage='Alternative text'
                  />
                  <input
                    value={
                      (attachment.get('description') as string | undefined) ??
                      ''
                    }
                    onChange={(event) => updateAlt(mediaId, event.target.value)}
                    onBlur={() =>
                      void api().put(`/api/v1/media/${mediaId}`, {
                        description: attachment.get('description') ?? '',
                      })
                    }
                  />
                </label>
                <IconButton
                  size='sm'
                  icon={TrashIcon}
                  color='destructive'
                  onClick={() =>
                    dispatch(removeComposeThreadMedia(id, mediaId))
                  }
                >
                  <FormattedMessage
                    id='compose.thread.remove_media'
                    defaultMessage='Remove media'
                  />
                </IconButton>
              </div>
            );
          })}
        </div>
      )}
      <div className={classes.threadItemFooter}>
        <IconButton
          size='sm'
          icon={ImageSquareIcon}
          loading={uploading}
          disabled={media.size >= maximumMedia}
          title={intl.formatMessage(messages.media)}
          onClick={() => fileRef.current?.click()}
        >
          <FormattedMessage {...messages.media} />
        </IconButton>
        <input
          ref={fileRef}
          hidden
          type='file'
          multiple
          onChange={(event) =>
            event.target.files && void upload(event.target.files)
          }
        />
        <ComposeEmojiButton onPick={insertEmoji} />
        <IconButton
          size='sm'
          icon={MarkdownLogoIcon}
          color={contentType === 'text/markdown' ? 'accent' : 'neutral'}
          aria-pressed={contentType === 'text/markdown'}
          onClick={() =>
            change(
              'content_type',
              contentType === 'text/markdown' ? 'text/plain' : 'text/markdown',
            )
          }
        >
          <FormattedMessage
            id='compose_form.markdown'
            defaultMessage='Markdown formatting'
          />
        </IconButton>
        <label className={classes.threadCompactField}>
          <span className='sr-only'>
            <FormattedMessage
              id='compose.thread.visibility'
              defaultMessage='Visibility'
            />
          </span>
          <select
            value={visibility}
            onChange={(event) => change('visibility', event.target.value)}
          >
            <option value='public'>
              {intl.formatMessage({
                id: 'privacy.public.short',
                defaultMessage: 'Public',
              })}
            </option>
            <option value='unlisted'>
              {intl.formatMessage({
                id: 'privacy.unlisted.short',
                defaultMessage: 'Quiet public',
              })}
            </option>
            <option value='private'>
              {intl.formatMessage({
                id: 'privacy.private.short',
                defaultMessage: 'Followers',
              })}
            </option>
            <option value='direct'>
              {intl.formatMessage({
                id: 'privacy.direct.short',
                defaultMessage: 'Private mention',
              })}
            </option>
          </select>
        </label>
        <label className={classes.threadCompactField}>
          <span className='sr-only'>
            <FormattedMessage
              id='compose.thread.language'
              defaultMessage='Language'
            />
          </span>
          <input
            aria-label='Language'
            value={language}
            onChange={(event) => change('language', event.target.value)}
          />
        </label>
        <span
          className={current > maximum ? classes.counterError : classes.counter}
        >
          {current > maximum && <WarningCircleIcon weight='fill' />}
          {current}/{maximum}
        </span>
      </div>
    </section>
  );
};
