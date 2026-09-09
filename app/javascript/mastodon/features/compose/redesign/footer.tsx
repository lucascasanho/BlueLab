import type React from 'react';
import { useCallback, useRef } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';

import {
  ImageSquareIcon,
  ChartBarHorizontalIcon,
  WarningCircleIcon,
  MarkdownLogoIcon,
  PlusIcon,
} from '@phosphor-icons/react';

import {
  addPoll,
  changeComposeContentType,
  uploadCompose,
  addComposeThreadItem,
} from '@/mastodon/actions/compose';
import { Button, IconButton } from '@/mastodon/components/button/redesign';
import { hideStatusCharacterCounter } from '@/mastodon/initial_state';
import {
  createAppSelector,
  useAppDispatch,
  useAppSelector,
} from '@/mastodon/store';

import { shouldShowCharacterCounter } from '../components/character_counter';

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

export const ComposeFooter: React.FC<{ onEmojiPick: OnEmojiPick }> = ({
  onEmojiPick,
}) => {
  const intl = useIntl();
  const type = useAppSelector(selectComposeType);
  const { current, max } = useAppSelector(selectComposeCharsCount);
  const { hasPoll, quotedStatusId } = useAppSelector(
    selectComposeHasAttachments,
  );
  const hasQuote = !!quotedStatusId;
  const isSubmitting = useAppSelector(
    (state) => !!state.compose.get('is_submitting'),
  );
  const canSubmit = useAppSelector(selectComposeCanSubmit);
  const contentType = useAppSelector(
    (state) => state.compose.get('content_type') as string,
  );
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
    dispatch(
      changeComposeContentType(
        contentType === 'text/markdown' ? 'text/plain' : 'text/markdown',
      ),
    );
  }, [contentType, dispatch]);
  const handleAddThreadItem = useCallback(() => {
    dispatch(addComposeThreadItem());
  }, [dispatch]);

  return (
    <footer className={classes.footer} data-bluelab-compose-footer>
      <ComposeUploadButton disabled={hasQuote} />

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
        disabled={hasQuote || hasPoll}
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
        | Immutable.List<string>
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

const ComposeUploadButton: React.FC<{ disabled?: boolean }> = ({
  disabled: disabledProp,
}) => {
  const { accepted, disabled, loading, resetFileKey } =
    useAppSelector(selectUpload);

  const ref = useRef<HTMLInputElement>(null);
  const handleClick = useCallback(() => {
    ref.current?.click();
  }, []);

  const dispatch = useAppDispatch();
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const files = event.target.files;
      if (files?.length) {
        void dispatch(uploadCompose(files));
      }
    },
    [dispatch],
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
        disabled={disabled}
        key={resetFileKey}
        onChange={handleChange}
      />
    </>
  );
};
