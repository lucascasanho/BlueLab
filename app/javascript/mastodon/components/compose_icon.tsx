import type { FC, SVGProps } from 'react';

import { Blue2ComposeIcon } from '@/mastodon/features/blue2/icons';

interface ComposeIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  weight?: string;
}

/**
 * Shared compose icon for every post composer launcher.
 * Uses the icon geometry previously exclusive to the BlueLab theme.
 */
export const ComposeIcon: FC<ComposeIconProps> = ({
  size = 24,
  weight,
  ...props
}) => <Blue2ComposeIcon {...props} size={size} weight={weight} />;
