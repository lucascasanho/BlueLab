import type React from 'react';
import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

import classNames from 'classnames';

import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowsLeftRightIcon,
  PencilSimpleIcon,
  TrashIcon,
} from '@phosphor-icons/react';

import { undoUploadCompose } from '@/mastodon/actions/compose';
import { openModal } from '@/mastodon/actions/modal';
import type { ApiAudioAttachmentJSON } from '@/mastodon/api_types/media_attachments';
import { Button, IconButton } from '@/mastodon/components/button/redesign';
import { StatusImage } from '@/mastodon/components/status/image';
import { Blurhash } from '@/mastodon/components/blurhash';
import { Icon } from '@/mastodon/components/icon';
import { selectAccountAvatarUrl } from '@/mastodon/selectors/accounts';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import type { MediaAttachment } from 'mastodon/models/media_attachment';
import DeleteIcon from '@/material-icons/400-24px/delete.svg?react';
import EditIcon from '@/material-icons/400-24px/edit.svg?react';
import SoundIcon from '@/material-icons/400-24px/graphic_eq.svg?react';

import { AudioVisualizer } from '../../audio/visualizer';

import attachmentClasses from './attachments.module.scss';
import classes from './upload.module.scss';
import type { ComposeAttachment } from './selectors';
import { selectComposeAttachment, selectComposeSensitive } from './selectors';

export const ComposeUpload: React.FC<{
  id?: string;
  className?: string;
  single?: boolean;
}> = ({ id, className, single }) => {
  const attachment = useAppSelector((state) =>
    selectComposeAttachment(state, id),
  );
  const { mediaSensitive } = useAppSelector(selectComposeSensitive);

  const dispatch = useAppDispatch();

  const handleAltEdit = useCallback(() => {
    dispatch(
      openModal({ modalType: 'FOCAL_POINT', modalProps: { mediaId: id } }),
    );
  }, [dispatch, id]);

  const handleRearrange = useCallback(() => {
    dispatch(openModal({ modalType: 'COMPOSER_REARRANGE', modalProps: {} }));
  }, [dispatch]);

  const handleDelete = useCallback(() => {
    dispatch(undoUploadCompose(id));
  }, [dispatch, id]);

  if (!attachment || attachment.type === 'unknown') {
    return <div className={classNames(attachmentClasses.mediaUpload, className)} />;
  }

  if (attachment.type === 'audio') {
    return <ComposeAudioUpload attachment={attachment} />;
  }

  return (
    <StatusImage
      attachment={attachment}
      className={classNames(className, attachmentClasses.mediaUpload)}
      sensitive={mediaSensitive}
    >
      <Button
        contrastOnMedia
        size='sm'
        variant='solid'
        onClick={handleAltEdit}
        className={attachmentClasses.mediaMenuAltButton}
        leadingIcon={PencilSimpleIcon}
        tooltip={{
          type: 'label',
          text: (
            <FormattedMessage
              id='account_edit.image_alt_modal.edit_title'
              defaultMessage='Edit alt text'
            />
          ),
          placement: 'top',
        }}
      >
        <span aria-hidden='true'>
          <FormattedMessage id='alt_text_badge.label' defaultMessage='ALT' />
        </span>
      </Button>

      <div className={attachmentClasses.mediaMenuButtons}>
        {!single && (
          <IconButton
            onClick={handleRearrange}
            icon={ArrowsLeftRightIcon}
            contrastOnMedia
            size='sm'
            variant='solid'
            tooltipPlacement='top'
          >
            <FormattedMessage
              id='compose.upload.rearrange'
              defaultMessage='Rearrange images'
            />
          </IconButton>
        )}
        <IconButton
          onClick={handleDelete}
          icon={TrashIcon}
          contrastOnMedia
          size='sm'
          variant='solid'
          tooltipPlacement='top'
        >
          <FormattedMessage
            id='compose.upload.menu.delete'
            defaultMessage='Remove image'
          />
        </IconButton>
      </div>
    </StatusImage>
  );
};

const ComposeAudioUpload: React.FC<{
  attachment: ComposeAttachment<ApiAudioAttachmentJSON>;
}> = ({ attachment }) => {
  const { id, preview_url } = attachment;
  const sensitive = useAppSelector((state) => !!state.compose.get('spoiler'));

  const dispatch = useAppDispatch();
  const handleDelete = useCallback(() => {
    dispatch(undoUploadCompose(id));
  }, [dispatch, id]);

  return (
    <div className={attachmentClasses.audioWrapper}>
      {!sensitive && preview_url && (
        <img src={preview_url} alt='' className={attachmentClasses.audioCover} />
      )}

      <audio
        src={attachment.url}
        controls
        className={attachmentClasses.audioControl}
        controlsList='nodownload noplaybackrate'
      />

      <IconButton
        size='md'
        variant='ghost'
        icon={TrashIcon}
        color='destructive'
        onClick={handleDelete}
      >
        <FormattedMessage
          id='compose.upload.audio.delete'
          defaultMessage='Remove audio'
        />
      </IconButton>
    </div>
  );
};


export const Upload: React.FC<{
  id: string;
  dragging?: boolean;
  draggable?: boolean;
  overlay?: boolean;
  tall?: boolean;
  wide?: boolean;
}> = ({ id, dragging, draggable = true, overlay, tall, wide }) => {
  const dispatch = useAppDispatch();
  const media = useAppSelector((state) =>
    (
      (state.compose as ImmutableMap<string, unknown>).get(
        'media_attachments',
      ) as ImmutableList<MediaAttachment>
    ).find((item) => item.get('id') === id),
  );
  const sensitive = useAppSelector(
    (state) => state.compose.get('spoiler') as boolean,
  );
  const userAvatar = useAppSelector(selectAccountAvatarUrl);

  const handleUndoClick = useCallback(() => {
    dispatch(undoUploadCompose(id));
  }, [dispatch, id]);

  const handleFocalPointClick = useCallback(() => {
    dispatch(
      openModal({ modalType: 'FOCAL_POINT', modalProps: { mediaId: id } }),
    );
  }, [dispatch, id]);

  const stopUploadDrag = useCallback((event: React.PointerEvent) => {
    event.stopPropagation();
  }, []);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  if (!media) {
    return null;
  }

  const focusX = media.getIn(['meta', 'focus', 'x']) as number;
  const focusY = media.getIn(['meta', 'focus', 'y']) as number;
  const x = (focusX / 2 + 0.5) * 100;
  const y = (focusY / -2 + 0.5) * 100;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const preview_url = media.get('preview_url') as string | null;
  const mediaUrl = media.get('url') as string | null;
  const mediaType = media.get('type') as string | null;
  const isAnimatedGif = mediaType === 'gifv' && !!mediaUrl;
  const isVideo = mediaType === 'video';
  const blurhash = media.get('blurhash') as string | null;

  return (
    <div
      className={classNames('compose-form__upload media-gallery__item', {
        dragging,
        draggable,
        overlay,
        'media-gallery__item--tall': tall,
        'media-gallery__item--wide': wide,
      })}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div
        className={classNames(
          'compose-form__upload__thumbnail',
          classes.thumbnail,
        )}
        style={{
          backgroundImage:
            !sensitive && preview_url ? `url(${preview_url})` : undefined,
          backgroundPosition: `${x}% ${y}%`,
        }}
      >
        {sensitive && blurhash && (
          <Blurhash hash={blurhash} className='compose-form__upload__preview' />
        )}
        {!sensitive && isVideo && (
          <video
            className={classNames('compose-form__upload__video', classes.video)}
            src={mediaUrl ?? undefined}
            poster={preview_url ?? undefined}
            controls
            playsInline
            preload='metadata'
            onPointerDown={stopUploadDrag}
          />
        )}
        {!sensitive && isAnimatedGif && (
          <video
            className={classNames('compose-form__upload__video', classes.video)}
            src={mediaUrl}
            poster={preview_url ?? undefined}
            autoPlay
            loop
            muted
            playsInline
            preload='metadata'
            aria-hidden='true'
            onPointerDown={stopUploadDrag}
          />
        )}
        {!sensitive && !preview_url && !isAnimatedGif && !isVideo && (
          <div className='compose-form__upload__visualizer'>
            <AudioVisualizer poster={userAvatar} />
            <Icon id='sound' icon={SoundIcon} />
          </div>
        )}

        <div className={classes.actions}>
          <button
            type='button'
            className={classNames(
              'icon-button',
              classes.actionButton,
              classes.deleteButton,
            )}
            onPointerDown={stopUploadDrag}
            onClick={handleUndoClick}
          >
            <Icon id='delete' icon={DeleteIcon} />
            <span className='sr-only'>
              <FormattedMessage
                id='compose.thread.remove_media'
                defaultMessage='Remove media'
              />
            </span>
          </button>
          <button
            type='button'
            className={classNames(
              'icon-button',
              classes.actionButton,
              classes.altButton,
            )}
            onPointerDown={stopUploadDrag}
            onClick={handleFocalPointClick}
          >
            <Icon id='edit' icon={EditIcon} />
            <span>ALT</span>
            <span className='sr-only'>
              <FormattedMessage
                id='compose.thread.add_alt'
                defaultMessage='Add alt text'
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
