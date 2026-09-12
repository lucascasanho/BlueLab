import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useIntl } from 'react-intl';

import type { List, Map } from 'immutable';

import { fetchAnnouncements } from '@/mastodon/actions/announcements';
import { CustomEmojiProvider } from '@/mastodon/components/emoji/context';
import type { IAnnouncement } from '@/mastodon/features/home_timeline/components/announcements/announcement';
import { Announcement } from '@/mastodon/features/home_timeline/components/announcements/announcement';
import { useCustomEmojis } from '@/mastodon/hooks/useCustomEmojis';
import { domain, title as instanceTitle } from '@/mastodon/initial_state';
import {
  createAppSelector,
  useAppDispatch,
  useAppSelector,
} from '@/mastodon/store';
import CampaignIcon from '@/material-icons/400-24px/campaign.svg?react';

import classes from './announcements.module.scss';

const announcementSelector = createAppSelector(
  [(state) => state.announcements as Map<string, List<Map<string, unknown>>>],
  (announcements) =>
    (
      (announcements.get('items')?.toJS() as IAnnouncement[] | undefined) ?? []
    ).toReversed(),
);

interface Blue2AnnouncementsProps {
  variant: 'navigation' | 'mobile';
  className?: string;
  badgeClassName?: string;
}

interface AnnouncementsCopy {
  trigger: string;
  title: (instanceName: string) => string;
}

const defaultAnnouncementsCopy: AnnouncementsCopy = {
  trigger: 'Notices',
  title: (instanceName) => `Notices from ${instanceName}`,
};

const frenchInstancePreposition = (instanceName: string) =>
  /^[aeiouyàâäéèêëîïôöùûüÿœæ]/i.test(instanceName)
    ? `d’${instanceName}`
    : `de ${instanceName}`;

const announcementsCopyByLocale: Record<string, AnnouncementsCopy> = {
  'pt-br': {
    trigger: 'Comunicados',
    title: (instanceName) => `Comunicados de ${instanceName}`,
  },
  pt: {
    trigger: 'Comunicados',
    title: (instanceName) => `Comunicados de ${instanceName}`,
  },
  en: defaultAnnouncementsCopy,
  es: {
    trigger: 'Comunicados',
    title: (instanceName) => `Comunicados de ${instanceName}`,
  },
  fr: {
    trigger: 'Communiqués',
    title: (instanceName) =>
      `Communiqués ${frenchInstancePreposition(instanceName)}`,
  },
};

const getAnnouncementsCopy = (locale: string): AnnouncementsCopy => {
  const normalizedLocale = locale.toLowerCase();
  const language = normalizedLocale.split('-')[0];

  return (
    announcementsCopyByLocale[normalizedLocale] ??
    (language ? announcementsCopyByLocale[language] : undefined) ??
    defaultAnnouncementsCopy
  );
};

export const Blue2Announcements: React.FC<Blue2AnnouncementsProps> = ({
  variant,
  className,
  badgeClassName,
}) => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const emojis = useCustomEmojis();
  const announcements = useAppSelector(announcementSelector);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<
    string | null
  >(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const unreadCount = useMemo(
    () => announcements.filter((announcement) => !announcement.read).length,
    [announcements],
  );
  const copy = useMemo(() => getAnnouncementsCopy(intl.locale), [intl.locale]);
  const resolvedInstanceTitle = instanceTitle ?? domain ?? 'this server';
  const modalTitle = copy.title(resolvedInstanceTitle);
  const currentIndex = selectedAnnouncementId
    ? announcements.findIndex(
        (announcement) => announcement.id === selectedAnnouncementId,
      )
    : -1;
  const currentAnnouncement =
    currentIndex >= 0 ? announcements[currentIndex] : undefined;
  const open = currentAnnouncement !== undefined;

  useEffect(() => {
    dispatch(fetchAnnouncements());
  }, [dispatch]);

  const handleClose = useCallback(() => {
    setSelectedAnnouncementId(null);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const trigger = triggerRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [handleClose, open]);

  const handleOpen = useCallback(() => {
    const firstUnread = announcements.find(
      (announcement) => !announcement.read,
    );
    const target = firstUnread ?? announcements[0];

    if (target) {
      setSelectedAnnouncementId(target.id);
    }
  }, [announcements]);

  const handlePrevious = useCallback(() => {
    const previous = announcements[currentIndex - 1];

    if (previous) {
      setSelectedAnnouncementId(previous.id);
    }
  }, [announcements, currentIndex]);

  const handleNext = useCallback(() => {
    const next = announcements[currentIndex + 1];

    if (next) {
      setSelectedAnnouncementId(next.id);
    }
  }, [announcements, currentIndex]);

  const handleBackdropMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  if (announcements.length === 0) {
    return null;
  }

  const modal =
    currentAnnouncement && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={classes.backdrop}
            role='presentation'
            onMouseDown={handleBackdropMouseDown}
          >
            <section
              ref={dialogRef}
              className={classes.dialog}
              role='dialog'
              aria-modal='true'
              aria-labelledby='blue2-announcements-title'
              tabIndex={-1}
            >
              <header className={classes.header}>
                <div className={classes.titleGroup}>
                  <span className={classes.titleIcon} aria-hidden='true'>
                    <CampaignIcon width={22} height={22} fill='currentColor' />
                  </span>
                  <h2 id='blue2-announcements-title'>{modalTitle}</h2>
                </div>

                <button
                  type='button'
                  className={classes.closeButton}
                  onClick={handleClose}
                  aria-label={intl.formatMessage({
                    id: 'bundle_modal_error.close',
                    defaultMessage: 'Close',
                  })}
                >
                  <span aria-hidden='true'>×</span>
                </button>
              </header>

              <div className={classes.scrollArea}>
                <CustomEmojiProvider emojis={emojis}>
                  <Announcement
                    key={currentAnnouncement.id}
                    announcement={currentAnnouncement}
                    active
                  />
                </CustomEmojiProvider>
              </div>

              {announcements.length > 1 && (
                <footer className={classes.pagination}>
                  <button
                    type='button'
                    className={classes.pageButton}
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    aria-label={intl.formatMessage({
                      id: 'lightbox.previous',
                      defaultMessage: 'Previous',
                    })}
                  >
                    <span aria-hidden='true'>‹</span>
                  </button>

                  <span className={classes.pageStatus} aria-live='polite'>
                    {currentIndex + 1} / {announcements.length}
                  </span>

                  <button
                    type='button'
                    className={classes.pageButton}
                    onClick={handleNext}
                    disabled={currentIndex === announcements.length - 1}
                    aria-label={intl.formatMessage({
                      id: 'lightbox.next',
                      defaultMessage: 'Next',
                    })}
                  >
                    <span aria-hidden='true'>›</span>
                  </button>
                </footer>
              )}
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type='button'
        className={className ?? classes.trigger}
        onClick={handleOpen}
        aria-haspopup='dialog'
        aria-expanded={open}
        aria-label={
          unreadCount > 0 ? `${copy.trigger} (${unreadCount})` : copy.trigger
        }
      >
        <CampaignIcon
          width={variant === 'navigation' ? 27 : 28}
          height={variant === 'navigation' ? 27 : 28}
          fill='currentColor'
        />

        {variant === 'navigation' && <span>{copy.trigger}</span>}

        {unreadCount > 0 &&
          (variant === 'navigation' ? (
            <span className={badgeClassName ?? classes.navigationBadge}>
              {unreadCount}
            </span>
          ) : (
            <span className={classes.mobileBadge} aria-hidden='true' />
          ))}
      </button>

      {modal}
    </>
  );
};