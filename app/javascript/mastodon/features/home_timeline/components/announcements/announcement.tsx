import type { FC } from 'react';
import { useEffect, useState } from 'react';

import { FormattedDate, FormattedMessage } from 'react-intl';

import { dismissAnnouncement } from '@/mastodon/actions/announcements';
import type { ApiAnnouncementJSON } from '@/mastodon/api_types/announcements';
import type { ApiMediaAttachmentJSON } from '@/mastodon/api_types/media_attachments';
import { AnimateEmojiProvider } from '@/mastodon/components/emoji/context';
import { EmojiHTML } from '@/mastodon/components/emoji/html';
import { useAppDispatch } from '@/mastodon/store';

import styles from './announcement_media.module.scss';
import { ReactionsBar } from './reactions';

export interface IAnnouncement extends ApiAnnouncementJSON {
  contentHtml: string;
}

interface AnnouncementProps {
  announcement: IAnnouncement;
  active?: boolean;
}

export const Announcement: FC<AnnouncementProps> = ({
  announcement,
  active,
}) => {
  const { read, id } = announcement;

  // Dismiss announcement when it becomes active.
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (active && !read) {
      dispatch(dismissAnnouncement(id));
    }
  }, [active, id, dispatch, read]);

  // But visually show the announcement as read only when it goes out of view.
  const [isVisuallyRead, setIsVisuallyRead] = useState(read);
  const [previousActive, setPreviousActive] = useState(active);
  if (active !== previousActive) {
    setPreviousActive(active);

    // This marks the announcement as read in the UI only after it
    // went from active to inactive.
    if (!active && isVisuallyRead !== read) {
      setIsVisuallyRead(read);
    }
  }

  return (
    <AnimateEmojiProvider>
      <strong className='announcements__range'>
        <FormattedMessage
          id='announcement.announcement'
          defaultMessage='Announcement'
        />
        <span>
          {' · '}
          <Timestamp announcement={announcement} />
        </span>
      </strong>

      <EmojiHTML
        className='announcements__content translate'
        htmlString={announcement.contentHtml}
        extraEmojis={announcement.emojis}
      />

      <MediaAttachments media={announcement.media_attachments} />

      <ReactionsBar reactions={announcement.reactions} id={announcement.id} />

      {!isVisuallyRead && <span className='announcements__unread' />}
    </AnimateEmojiProvider>
  );
};

const MediaAttachments: FC<{ media: ApiMediaAttachmentJSON[] }> = ({ media }) => {
  if (media.length === 0) {
    return null;
  }

  return (
    <div className={styles.media}>
      {media.map((attachment) => (
        <div className={styles.mediaItem} key={attachment.id}>
          <MediaAttachment attachment={attachment} />
        </div>
      ))}
    </div>
  );
};

const MediaAttachment: FC<{ attachment: ApiMediaAttachmentJSON }> = ({
  attachment,
}) => {
  const label = attachment.description ?? '';

  if (attachment.type === 'image') {
    return (
      <a href={attachment.url} target='_blank' rel='noopener noreferrer'>
        <img
          className={styles.image}
          src={attachment.url}
          alt={label}
          loading='lazy'
        />
      </a>
    );
  }

  if (attachment.type === 'gifv') {
    return (
      <video
        className={styles.video}
        src={attachment.url}
        poster={attachment.preview_url}
        aria-label={label || undefined}
        autoPlay
        loop
        muted
        playsInline
        controls
        preload='metadata'
      />
    );
  }

  if (attachment.type === 'video') {
    return (
      <video
        className={styles.video}
        src={attachment.url}
        poster={attachment.preview_url}
        aria-label={label || undefined}
        controls
        playsInline
        preload='metadata'
      />
    );
  }

  if (attachment.type === 'audio') {
    return (
      <audio
        className={styles.audio}
        src={attachment.url}
        aria-label={label || undefined}
        controls
        preload='metadata'
      />
    );
  }

  return (
    <a
      className={styles.fallback}
      href={attachment.url}
      target='_blank'
      rel='noopener noreferrer'
    >
      {label || attachment.url}
    </a>
  );
};

const Timestamp: FC<Pick<AnnouncementProps, 'announcement'>> = ({
  announcement,
}) => {
  const startsAt = announcement.starts_at && new Date(announcement.starts_at);
  const endsAt = announcement.ends_at && new Date(announcement.ends_at);
  const now = new Date();
  const hasTimeRange = startsAt && endsAt;
  const skipTime = announcement.all_day;

  if (hasTimeRange) {
    const skipYear =
      startsAt.getFullYear() === endsAt.getFullYear() &&
      endsAt.getFullYear() === now.getFullYear();
    const skipEndDate =
      startsAt.getDate() === endsAt.getDate() &&
      startsAt.getMonth() === endsAt.getMonth() &&
      startsAt.getFullYear() === endsAt.getFullYear();
    return (
      <>
        <FormattedDate
          value={startsAt}
          year={
            skipYear || startsAt.getFullYear() === now.getFullYear()
              ? undefined
              : 'numeric'
          }
          month='short'
          day='2-digit'
          hour={skipTime ? undefined : '2-digit'}
          minute={skipTime ? undefined : '2-digit'}
        />{' '}
        -{' '}
        <FormattedDate
          value={endsAt}
          year={
            skipYear || endsAt.getFullYear() === now.getFullYear()
              ? undefined
              : 'numeric'
          }
          month={skipEndDate ? undefined : 'short'}
          day={skipEndDate ? undefined : '2-digit'}
          hour={skipTime ? undefined : '2-digit'}
          minute={skipTime ? undefined : '2-digit'}
        />
      </>
    );
  }
  const publishedAt = new Date(announcement.published_at);
  return (
    <FormattedDate
      value={publishedAt}
      year={
        publishedAt.getFullYear() === now.getFullYear() ? undefined : 'numeric'
      }
      month='short'
      day='2-digit'
      hour={skipTime ? undefined : '2-digit'}
      minute={skipTime ? undefined : '2-digit'}
    />
  );
};
