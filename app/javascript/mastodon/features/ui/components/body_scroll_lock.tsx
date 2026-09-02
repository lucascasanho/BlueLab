import { useLayoutEffect } from 'react';

import { createAppSelector, useAppSelector } from 'mastodon/store';

const getShouldLockBodyScroll = createAppSelector(
  [
    (state) => state.navigation.open,
    (state) => state.modal.get('stack').size > 0,
  ],
  (isMobileMenuOpen: boolean, isModalOpen: boolean) =>
    isMobileMenuOpen || isModalOpen,
);

/**
 * This component locks scrolling on the body while a modal or the mobile menu
 * is open. The BlueLab composer allows the page behind it to scroll normally
 * when the pointer is outside of the compose surface.
 */

export const BodyScrollLock: React.FC = () => {
  const shouldLockBodyScroll = useAppSelector(getShouldLockBodyScroll);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle(
      'has-modal',
      shouldLockBodyScroll,
    );
  }, [shouldLockBodyScroll]);

  return null;
};
