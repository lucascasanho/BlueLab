import { supportsPassiveEvents } from 'detect-passive-events';

import { forceSingleColumn, hasMultiColumnPath } from './initial_state';

const LAYOUT_BREAKPOINT = 630;
const BLUE2_MOBILE_BREAKPOINT = 1174;

export const isMobile = (width: number) => width <= LAYOUT_BREAKPOINT;

export const isBlue2MobileViewport = (width: number) =>
  typeof document !== 'undefined' &&
  document.body.dataset.theme === 'blue-2' &&
  width <= BLUE2_MOBILE_BREAKPOINT;

export const transientSingleColumn = !forceSingleColumn && !hasMultiColumnPath;

export type LayoutType = 'mobile' | 'single-column' | 'multi-column';
export const layoutFromWindow = (): LayoutType => {
  // Blue2 intentionally ignores the user's advanced-interface preference on
  // phones and tablets. The mobile theme owns the complete compact shell.
  if (isBlue2MobileViewport(window.innerWidth) || isMobile(window.innerWidth)) {
    return 'mobile';
  } else if (!forceSingleColumn && !transientSingleColumn) {
    return 'multi-column';
  } else {
    return 'single-column';
  }
};

const listenerOptions = supportsPassiveEvents ? { passive: true } : false;

let userTouching = false;

const touchListener = () => {
  userTouching = true;

  window.removeEventListener('touchstart', touchListener);
};

window.addEventListener('touchstart', touchListener, listenerOptions);

export const isUserTouching = () => userTouching;
