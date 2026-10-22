import type React from 'react';
import { useCallback } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';

import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';

import { undoUploadCompose } from '@/mastodon/actions/compose';
import { openModal } from '@/mastodon/actions/modal';
import type { ApiAudioAttachmentJSON } from '@/mastodon/api_types/media_attachments';
import { Blurhash } from '@/mastodon/components/blurhash';
import { Button, IconButton } from '@/mastodon/components/button/redesign';
import { StatusImage } from '@/mastodon/components/status/image';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import classes from './attachments.module.scss';
import type { ComposeAttachment } from './selectors';
import { selectComposeAttachment } from './selectors';

export const ComposeUpload: React.FC<{
  id?: string;
  className?: string;
}> = ({ id, className }) => {
  const attachment = useAppSelector((state) =>
    selectComposeAttachment(state, id),
  );
  const sensitive = useAppSelector((state) => !!state.compose.get('spoiler'));
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const handleEdit = useCallback(() => {
    if (id) {
      dispatch(
        openModal({ modalType: 'FOCAL_POINT', modalProps: { mediaId: id } }),
      );
    }
  }, [dispatch, id]);

  const handleDelete = useCallback(() => {
    if (id) {
      dispatch(undoUploadCompose(id));
    }
  }, [dispatch, id]);

  if (!attachment || attachment.type === 'unknown') {
    return <div className={classNames(classes.mediaUpload, className)} />;
  }

  if (attachment.type === 'audio') {
    return <ComposeAudioUpload attachment={attachment} onEdit={handleEdit} />;
  }

  return (
    <StatusImage
      attachment={attachment}
      className={classNames(className, classes.mediaUpload)}
      sensitive={sensitive}
      animateGifv
    >
      {sensitive && attachment.blurhash && (
        <Blurhash hash={attachment.blurhash} className={classes.blurHash} />
      )}

      {!sensitive && attachment.type === 'video' && (
        <video
          className={classes.mediaVideo}
          src={attachment.url}
          poster={attachment.preview_url}
          controls
          playsInline
          preload='metadata'
        />
      )}

      <IconButton
        as='button'
        type='button'
        size='sm'
        variant='solid'
        icon={TrashIcon}
        className={classes.mediaMenuAltButton}
        onClick={handleDelete}
      >
        <span className='sr-only'>
          <FormattedMessage
            id='compose.upload.menu.delete'
            defaultMessage='Remove media'
          />
        </span>
      </IconButton>

      <Button
        as='button'
        type='button'
        size='sm'
        variant='solid'
        leadingIcon={PencilSimpleIcon}
        className={classes.mediaMenuButtons}
        onClick={handleEdit}
        aria-label={intl.formatMessage({
          id: 'compose.upload.menu.add_alt',
          defaultMessage: 'Edit media and alt text',
        })}
      >
        <span aria-hidden='true'>ALT</span>
        <span className='sr-only'>
          <FormattedMessage
            id='compose.upload.menu.add_alt'
            defaultMessage='Edit media and alt text'
          />
        </span>
      </Button>

      {attachment.description && (
        <span className={classes.mediaAlt}>
          <FormattedMessage id='compose.upload.alt' defaultMessage='Alt' />
        </span>
      )}
    </StatusImage>
  );
};

const ComposeAudioUpload: React.FC<{
  attachment: ComposeAttachment<ApiAudioAttachmentJSON>;
  onEdit: () => void;
}> = ({ attachment, onEdit }) => {
  const { id, preview_url } = attachment;
  const sensitive = useAppSelector((state) => !!state.compose.get('spoiler'));

  const dispatch = useAppDispatch();
  const handleDelete = useCallback(() => {
    dispatch(undoUploadCompose(id));
  }, [dispatch, id]);

  return (
    <div className={classes.audioWrapper}>
      {!sensitive && preview_url && (
        <img src={preview_url} alt='' className={classes.audioCover} />
      )}

      <audio
        src={attachment.url}
        controls
        className={classes.audioControl}
        controlsList='nodownload noplaybackrate'
      />

      <IconButton
        as='button'
        type='button'
        size='sm'
        variant='solid'
        icon={TrashIcon}
        className={classes.audioDeleteButton}
        onClick={handleDelete}
      >
        <span className='sr-only'>
          <FormattedMessage
            id='compose.upload.audio.delete'
            defaultMessage='Remove audio'
          />
        </span>
      </IconButton>

      <IconButton
        as='button'
        type='button'
        size='sm'
        variant='solid'
        icon={PencilSimpleIcon}
        className={classes.audioAltButton}
        onClick={onEdit}
      >
        <span className='sr-only'>
          <FormattedMessage
            id='compose.upload.menu.add_alt'
            defaultMessage='Add alt text'
          />
        </span>
      </IconButton>
    </div>
  );
};
