import type { FC, SVGProps } from 'react';

import EditSquareIcon from '@/material-icons/400-24px/edit_square.svg?react';

interface ComposeIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  weight?: string;
}

/**
 * Canonical compose icon used by BlueLab launchers.
 *
 * The underlying asset is Mastodon's vendored Material Symbols `edit_square`
 * icon (Apache-2.0). Keep the icon color inherited from the surrounding
 * control so instance accent colors and light/dark appearance remain intact.
 */
export const ComposeIcon: FC<ComposeIconProps> = ({
  size = 24,
  // NavigationLink sends Phosphor's active-state weight hint to every icon.
  // This fixed Material glyph intentionally stays identical in every state.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  weight: _weight,
  ...props
}) => (
  <EditSquareIcon {...props} width={size} height={size} fill='currentColor' />
);
