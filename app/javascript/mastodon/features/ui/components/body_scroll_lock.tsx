import { useLayoutEffect } from 'react';

import { createAppSelector, useAppSelector } from 'mastodon/store';

const getShouldLockBodyScroll = createAppSelector(
  [
    (state) => state.navigation.open,
    (state) => state.modal.get('stack').size > 0,
    (state) => state.composer.displayState === 'showing',
  ],
  (isMobileMenuOpen: boolean, isModalOpen: boolean, isComposerOpen: boolean) =>
    isMobileMenuOpen || isModalOpen || isComposerOpen,
);

/**
 * This component locks scrolling on the body while a modal, the mobile menu,
 * or the expanded BlueLab composer is open.
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
