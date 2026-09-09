import type React from 'react';
import { useCallback, useRef, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';

import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';

import {
  ImageSquareIcon,
  ChartBarHorizontalIcon,
  WarningCircleIcon,
  MarkdownLogoIcon,
  PlusIcon,
} from '@phosphor-icons/react';
import { length } from 'stringz';

import {
  addPoll,
  changeComposeContentType,
  uploadCompose,
  addComposeThreadItem,
  addComposeThreadMedia,
  changeComposeThreadItem,
} from '@/mastodon/actions/compose';
import api from '@/mastodon/api';
import type { ApiMediaAttachmentJSON } from '@/mastodon/api_types/media_attachments';
import { Button, IconButton } from '@/mastodon/components/button/redesign';
import {
  hideStatusCharacterCounter,
  statusMaxCharacters,
} from '@/mastodon/initial_state';
import {
  createAppSelector,
  useAppDispatch,
  useAppSelector,
} from '@/mastodon/store';

import { shouldShowCharacterCounter } from '../components/character_counter';
import { countableText } from '../util/counter';

import type { OnEmojiPick } from './emoji';
import { ComposeEmojiButton } from './emoji';
import { ComposeSchedule } from './schedule';
import {
  selectComposeAttachments,
  selectComposeCanSubmit,
  selectComposeCharsCount,
  selectComposeHasAttachments,
  selectComposeType,
} from './selectors';
import classes from './styles.module.scss';

const messages = defineMessages({
  addThreadItem: {
    id: 'compose.thread.add',
    defaultMessage: 'Add another post to this thread',
  },
});

export const ComposeFooter: React.FC<{
  onEmojiPick: OnEmojiPick;
  activeThreadItemId?: string | null;
}> = ({ onEmojiPick, activeThreadItemId = null }) => {
  const intl = useIntl();
  const type = useAppSelector(selectComposeType);
  const rootCounter = useAppSelector(selectComposeCharsCount);
  const { hasPoll, quotedStatusId } = useAppSelector(
    selectComposeHasAttachments,
  );
  const hasQuote = !!quotedStatusId;
  const isSubmitting = useAppSelector(
    (state) => !!state.compose.get('is_submitting'),
  );
  const canSubmit = useAppSelector(selectComposeCanSubmit);
  const rootContentType = useAppSelector(
    (state) => state.compose.get('content_type') as string,
  );
  const activeThreadItem = useAppSelector((state) => {
    if (!activeThreadItemId) return null;
    return (
      (
        state.compose.get('thread_items') as ImmutableList<
          ImmutableMap<string, unknown>
        >
      ).find((item) => item.get('id') === activeThreadItemId) ?? null
    );
  });
  const threadMax = useAppSelector(
    (state) =>
      state.server.server.item?.configuration.statuses.max_characters ??
      statusMaxCharacters ??
      500,
  );
  const contentType = activeThreadItem
    ? (activeThreadItem.get('content_type') as string)
    : rootContentType;
  const activeText = activeThreadItem?.get('text');
  const activeSpoiler = activeThreadItem?.get('spoiler_text');
  const current = activeThreadItem
    ? length(
        `${countableText(typeof activeText === 'string' ? activeText : '')}${typeof activeSpoiler === 'string' ? activeSpoiler : ''}`,
      )
    : rootCounter.current;
  const max = activeThreadItem ? threadMax : rootCounter.max;
  const dispatch = useAppDispatch();
  const scheduledAt = useAppSelector(
    (state) => state.compose.get('scheduled_at') as string | null,
  );
  const threadItemCount = useAppSelector(
    (state) =>
      (state.compose.get('thread_items') as unknown as { size: number }).size,
  );
  const hasPublishedThreadItems = useAppSelector(
    (state) =>
      !(
        state.compose.get('thread_published_ids') as unknown as {
          isEmpty: () => boolean;
        }
      ).isEmpty(),
  );
  const handlePoll = useCallback(() => {
    dispatch(addPoll());
  }, [dispatch]);
  const handleContentType = useCallback(() => {
    const next =
      contentType === 'text/markdown' ? 'text/plain' : 'text/markdown';
    if (activeThreadItemId) {
      dispatch(
        changeComposeThreadItem(activeThreadItemId, 'content_type', next),
      );
    } else {
      dispatch(changeComposeContentType(next));
    }
  }, [activeThreadItemId, contentType, dispatch]);
  const handleAddThreadItem = useCallback(() => {
    dispatch(addComposeThreadItem());
  }, [dispatch]);

  return (
    <footer className={classes.footer} data-bluelab-compose-footer>
      <ComposeUploadButton
        activeThreadItemId={activeThreadItemId}
        disabled={!activeThreadItemId && hasQuote}
      />

      <ComposeEmojiButton onPick={onEmojiPick} />

      <IconButton
        as='button'
        size='sm'
        icon={MarkdownLogoIcon}
        color={contentType === 'text/markdown' ? 'accent' : 'neutral'}
        aria-pressed={contentType === 'text/markdown'}
        onClick={handleContentType}
      >
        <FormattedMessage
          id='compose_form.markdown'
          defaultMessage='Markdown formatting'
        />
      </IconButton>

      <IconButton
        size='sm'
        icon={ChartBarHorizontalIcon}
        disabled={hasQuote || hasPoll || !!activeThreadItemId}
        onClick={handlePoll}
      >
        <FormattedMessage
          id='poll_button.add_poll'
          defaultMessage='Add a poll'
        />
      </IconButton>

      {type !== 'message' && <ComposeSchedule />}

      <div className={classes.flexGrowWrap}>
        {shouldShowCharacterCounter(
          hideStatusCharacterCounter,
          current,
          max,
        ) && (
          <span
            className={classNames(
              classes.counter,
              current > max && classes.counterError,
            )}
          >
            {current > max && <WarningCircleIcon weight='fill' />}
            <FormattedMessage
              id='compose.counter'
              defaultMessage='{current, number}/{max, number}'
              values={{ current, max }}
            />
          </span>
        )}

        <div className={classes.primaryActions} data-compose-primary-actions>
          {type !== 'message' && (
            <IconButton
              as='button'
              type='button'
              size='sm'
              icon={PlusIcon}
              className={classes.threadAddButton}
              title={intl.formatMessage(messages.addThreadItem)}
              disabled={threadItemCount >= 24 || hasPublishedThreadItems}
              onClick={handleAddThreadItem}
            >
              <FormattedMessage {...messages.addThreadItem} />
            </IconButton>
          )}
          <Button
            variant='solid'
            color='accent'
            type='submit'
            className={classes.submitButton}
            disabled={!canSubmit}
            loading={isSubmitting}
          >
            {type !== 'message' && !scheduledAt && (
              <FormattedMessage id='compose.publish' defaultMessage='Publish' />
            )}
            {type !== 'message' && scheduledAt && (
              <FormattedMessage
                id='compose.schedule.submit'
                defaultMessage='Schedule'
              />
            )}
            {type === 'message' && (
              <FormattedMessage
                id='compose.message.publish'
                defaultMessage='Send'
              />
            )}
          </Button>
        </div>
      </div>
    </footer>
  );
};

const selectUpload = createAppSelector(
  [
    (state) =>
      state.media_attachments.get('accept_content_types') as
        | ImmutableList<string>
        | undefined,
    (state) => !!state.compose.get('is_uploading'),
    selectComposeAttachments,
    (state) => state.compose.get('pending_media_attachments') as number,
    (state) =>
      state.server.server.item?.configuration.statuses.max_media_attachments ??
      4,
    (state) => state.compose.get('resetFileKey') as number,
  ],
  (
    fileTypesList,
    isUploading,
    attachments,
    pendingAttachments,
    maxAttachments,
    resetFileKey,
  ) => {
    const hasVideoOrAudio = attachments.some(
      (attachment) =>
        attachment.type === 'audio' || attachment.type === 'video',
    );
    const hasImages = attachments.some(
      (attachment) => attachment.type === 'image' || attachment.type === 'gifv',
    );
    const fileTypes = (fileTypesList?.toArray() ?? []).filter(
      (fileType) => !hasImages || fileType.startsWith('image/'),
    );
    return {
      accepted: fileTypes.join(','),
      loading: isUploading || pendingAttachments > 0,
      disabled:
        attachments.length + pendingAttachments >= maxAttachments ||
        hasVideoOrAudio,
      resetFileKey,
    };
  },
);

const ComposeUploadButton: React.FC<{
  disabled?: boolean;
  activeThreadItemId?: string | null;
}> = ({ disabled: disabledProp, activeThreadItemId = null }) => {
  const rootUpload = useAppSelector(selectUpload);
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
  const fileTypesList = useAppSelector(
    (state) =>
      state.media_attachments.get('accept_content_types') as
        | ImmutableList<string>
        | undefined,
  );
  const maxAttachments = useAppSelector(
    (state) =>
      state.server.server.item?.configuration.statuses.max_media_attachments ??
      4,
  );
  const [threadUploading, setThreadUploading] = useState(false);
  const isThreadTarget = !!activeThreadItemId && !!threadMedia;
  const threadHasVideoOrAudio =
    threadMedia?.some((attachment) => {
      const type = attachment.get('type');
      return type === 'audio' || type === 'video';
    }) ?? false;
  const threadHasImages =
    threadMedia?.some((attachment) => {
      const type = attachment.get('type');
      return type === 'image' || type === 'gifv';
    }) ?? false;
  const accepted = isThreadTarget
    ? (fileTypesList?.toArray() ?? [])
        .filter((fileType) => !threadHasImages || fileType.startsWith('image/'))
        .join(',')
    : rootUpload.accepted;
  const disabled = isThreadTarget
    ? threadMedia.size >= maxAttachments || threadHasVideoOrAudio
    : rootUpload.disabled;
  const loading = isThreadTarget ? threadUploading : rootUpload.loading;

  const ref = useRef<HTMLInputElement>(null);
  const handleClick = useCallback(() => {
    ref.current?.click();
  }, []);

  const dispatch = useAppDispatch();
  const uploadThread = useCallback(
    async (files: FileList) => {
      if (!activeThreadItemId || !threadMedia) return;
      setThreadUploading(true);
      try {
        for (const file of Array.from(files).slice(
          0,
          Math.max(0, maxAttachments - threadMedia.size),
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
          dispatch(addComposeThreadMedia(activeThreadItemId, response.data));
        }
      } finally {
        setThreadUploading(false);
        if (ref.current) ref.current.value = '';
      }
    },
    [activeThreadItemId, dispatch, maxAttachments, threadMedia],
  );
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const files = event.target.files;
      if (!files?.length) return;

      if (isThreadTarget) {
        void uploadThread(files);
      } else {
        void dispatch(uploadCompose(files));
      }
    },
    [dispatch, isThreadTarget, uploadThread],
  );

  return (
    <>
      <IconButton
        size='sm'
        icon={ImageSquareIcon}
        disabled={disabled || disabledProp}
        loading={loading}
        onClick={handleClick}
      >
        <FormattedMessage
          id='upload_button.label'
          defaultMessage='Add images, a video or an audio file'
        />
      </IconButton>
      <input
        hidden
        ref={ref}
        type='file'
        multiple
        accept={accepted}
        disabled={disabled || disabledProp}
        key={isThreadTarget ? activeThreadItemId : rootUpload.resetFileKey}
        onChange={handleChange}
      />
    </>
  );
};
