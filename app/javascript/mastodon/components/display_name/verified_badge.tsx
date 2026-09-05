import { useCallback, useId, useState } from 'react';
import type { FC, KeyboardEvent, MouseEvent } from 'react';

import { useIntl } from 'react-intl';

import { domain, title as instanceTitle } from 'mastodon/initial_state';

import { Popover } from '../popover';

import type { DisplayNameProps } from './index';
import classes from './verified_badge.module.scss';

const VERIFIED_ROLE_NAMES = new Set([
  'verified',
  'verificado',
  'trusted verified',
  'vf',
]);

const copy = {
  en: {
    title: 'Verified account',
    description: (instance: string) =>
      `This account was verified by the moderation team of ${instance}.`,
    since: (date: string) => `Verified since: ${date}`,
    sinceUnknown: 'Verified since: date not recorded',
  },
  pt: {
    title: 'Conta verificada',
    description: (instance: string) =>
      `Esta conta foi verificada pela moderação de ${instance}.`,
    since: (date: string) => `Verificado desde: ${date}`,
    sinceUnknown: 'Verificado desde: data não registrada',
  },
} as const;

type IconProps = {
  className: string;
};

const VerifiedMark: FC<IconProps> = ({ className }) => {
  const gradientId = `bluelab-verified-${useId().replace(/:/g, '')}`;

  return (
    <svg
      className={className}
      aria-hidden='true'
      viewBox='0 0 24 24'
      focusable='false'
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1='2'
          x2='22'
          y1='2'
          y2='22'
          gradientUnits='userSpaceOnUse'
        >
          <stop
            offset='0'
            stopColor='var(--color-text-brand-soft, currentColor)'
          />
          <stop
            offset='0.5'
            stopColor='var(--color-bg-brand-base, var(--color-text-brand, currentColor))'
          />
          <stop
            offset='1'
            stopColor='var(--color-text-brand, currentColor)'
          />
        </linearGradient>
      </defs>

      {/*
        SVG path supplied by Lucas in the Sistema de verificação request.
        BlueLab adds the palette-aware gradient and interactive integration.
      */}
      <path
        d='M22.51,13.76a3,3,0,0,1,0-3.52l.76-1.05a1,1,0,0,0,.14-.9,1.018,1.018,0,0,0-.64-.64l-1.23-.4A2.987,2.987,0,0,1,19.47,4.4V3.1a1,1,0,0,0-1.31-.95l-1.24.4a3,3,0,0,1-3.35-1.09L12.81.41a1.036,1.036,0,0,0-1.62,0l-.76,1.05A3,3,0,0,1,7.08,2.55l-1.24-.4a1,1,0,0,0-1.31.95V4.4A2.987,2.987,0,0,1,2.46,7.25l-1.23.4a1.018,1.018,0,0,0-.64.64,1,1,0,0,0,.14.9l.76,1.05a3,3,0,0,1,0,3.52L.73,14.81a1,1,0,0,0-.14.9,1.018,1.018,0,0,0,.64.64l1.23.4A2.987,2.987,0,0,1,4.53,19.6v1.3a1,1,0,0,0,1.31.95l1.23-.4a2.994,2.994,0,0,1,3.36,1.09l.76,1.05a1.005,1.005,0,0,0,1.62,0l.76-1.05a3,3,0,0,1,3.36-1.09l1.23.4a1,1,0,0,0,1.31-.95V19.6a2.987,2.987,0,0,1,2.07-2.85l1.23-.4a1.018,1.018,0,0,0,.64-.64,1,1,0,0,0-.14-.9Zm-5.8-3.053-5,5a1,1,0,0,1-1.414,0l-3-3a1,1,0,1,1,1.414-1.414L11,13.586l4.293-4.293a1,1,0,0,1,1.414,1.414Z'
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
};

const CalendarMark: FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    aria-hidden='true'
    viewBox='0 0 24 24'
    focusable='false'
  >
    <path
      fill='currentColor'
      d='M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 9H5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8ZM6 6a1 1 0 0 0-1 1v2h14V7a1 1 0 0 0-1-1H6Z'
    />
  </svg>
);

export function hasVerifiedRole(account: DisplayNameProps['account']) {
  if (!account) {
    return false;
  }

  if (account.verified_by_role) {
    return true;
  }

  return Array.from(account.roles).some((role) =>
    VERIFIED_ROLE_NAMES.has(role.name.trim().toLowerCase()),
  );
}

export const VerifiedBadge: FC<Pick<DisplayNameProps, 'account'>> = ({
  account,
}) => {
  const intl = useIntl();
  const uniqueId = useId().replace(/:/g, '');
  const popoverId = `bluelab-verified-popover-${uniqueId}`;
  const headingId = `bluelab-verified-heading-${uniqueId}`;
  const [open, setOpen] = useState(false);
  const [triggerElement, setTriggerElement] = useState<HTMLSpanElement | null>(
    null,
  );

  const handleClick = useCallback((event: MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen((previous) => !previous);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setOpen((previous) => !previous);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handlePopoverClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
    },
    [],
  );

  if (!account || !hasVerifiedRole(account)) {
    return null;
  }

  const language = intl.locale.toLowerCase().split(/[-_]/)[0];
  const localizedCopy = language === 'pt' ? copy.pt : copy.en;
  const instanceName = instanceTitle ?? domain ?? 'Mastodon';
  const verifiedAt = account.verified_by_role_since
    ? new Date(account.verified_by_role_since)
    : null;
  const formattedDate =
    verifiedAt && !Number.isNaN(verifiedAt.getTime())
      ? intl.formatDate(verifiedAt, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null;

  const titleText = localizedCopy.title;
  const descriptionText = localizedCopy.description(instanceName);
  const sinceText = formattedDate
    ? localizedCopy.since(formattedDate)
    : localizedCopy.sinceUnknown;

  return (
    <>
      <span
        ref={setTriggerElement}
        className={classes.trigger}
        role='button'
        tabIndex={0}
        aria-label={titleText}
        aria-haspopup='dialog'
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <VerifiedMark className={classes.badge} />
      </span>

      <Popover
        isOpen={open}
        reference={triggerElement}
        onClose={handleClose}
        placement='bottom-start'
        offset={8}
      >
        {({ props }) => (
          <div
            {...props}
            id={popoverId}
            role='dialog'
            aria-labelledby={headingId}
            className={`dropdown-animation ${classes.popover}`}
            onClickCapture={handlePopoverClick}
          >
            <h3 id={headingId} className={classes.title}>
              {titleText}
            </h3>
            <div className={classes.infoRow}>
              <VerifiedMark className={classes.inlineBadge} />
              <p className={classes.description}>{descriptionText}</p>
            </div>
            <div className={classes.infoRow}>
              <CalendarMark className={classes.calendarIcon} />
              <p className={classes.since}>{sinceText}</p>
            </div>
          </div>
        )}
      </Popover>
    </>
  );
};
