import { useId } from 'react';
import type { FC } from 'react';

import type { DisplayNameProps } from './index';

const VERIFIED_ROLE_FRAGMENT = 'verificado';

export function hasVerifiedRole(account: DisplayNameProps['account']) {
  if (!account) {
    return false;
  }

  if (account.verified_by_role) {
    return true;
  }

  return Array.from(account.roles).some((role) =>
    role.name.trim().toLocaleLowerCase().includes(VERIFIED_ROLE_FRAGMENT),
  );
}

export const VerifiedBadge: FC<Pick<DisplayNameProps, 'account'>> = ({
  account,
}) => {
  const gradientId = `bluelab-verified-${useId().replace(/:/g, '')}`;

  if (!hasVerifiedRole(account)) {
    return null;
  }

  return (
    <svg
      aria-label='Verificado'
      role='img'
      viewBox='0 0 24 24'
      focusable='false'
      style={{
        color: 'var(--color-text-brand)',
        display: 'inline-block',
        flex: '0 0 auto',
        height: '0.95em',
        marginInlineStart: '0.24em',
        overflow: 'visible',
        verticalAlign: '-0.12em',
        width: '0.95em',
      }}
    >
      <title>Verificado</title>
      <defs>
        <linearGradient
          id={gradientId}
          x1='3'
          x2='21'
          y1='3'
          y2='21'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0' stopColor='currentColor' stopOpacity='0.72' />
          <stop offset='0.48' stopColor='currentColor' stopOpacity='1' />
          <stop offset='1' stopColor='currentColor' stopOpacity='0.68' />
        </linearGradient>
      </defs>

      {/*
        Visual reference/credit: Bluesky Social PBC's trusted verifier
        `assets/icons/verifierCheck.svg`.
        https://github.com/bluesky-social/social-app/blob/main/assets/icons/verifierCheck.svg

        The Bluesky vector path is intentionally NOT copied. Bluesky's ASSETS.md
        identifies verifierCheck.svg as a Bluesky trademark asset outside the
        repository's MIT license. This BlueLab rosette geometry is original.
      */}
      <polygon
        points='12,2 15.33,3.96 19.07,4.93 20.04,8.67 22,12 20.04,15.33 19.07,19.07 15.33,20.04 12,22 8.67,20.04 4.93,19.07 3.96,15.33 2,12 3.96,8.67 4.93,4.93 8.67,3.96'
        fill={`url(#${gradientId})`}
        stroke='rgb(from var(--color-text-on-brand-base) r g b / 28%)'
        strokeLinejoin='round'
        strokeWidth='0.65'
      />
      <path
        d='m7.5 12.2 2.75 2.75 6.35-6.35'
        fill='none'
        stroke='var(--color-text-on-brand-base)'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='2.15'
      />
    </svg>
  );
};
