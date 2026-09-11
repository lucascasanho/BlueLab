import type { FC, SVGProps } from 'react';

import EditSquareIcon from '@/material-icons/400-24px/edit_square.svg?react';

type ComposeIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  weight?: string;
};

/**
 * Canonical compose icon used by BlueLab launchers.
 *
 * The underlying asset is Mastodon's vendored Material Symbols `edit_square`
 * icon (Apache-2.0). Keep the icon color inherited from the surrounding
 * control so instance accent colors and light/dark appearance remain intact.
 */
export const ComposeIcon: FC<ComposeIconProps> = ({
  size = 24,
  weight: _weight,
  ...props
}) => (
  <EditSquareIcon
    {...props}
    width={size}
    height={size}
    fill='currentColor'
  />
);
