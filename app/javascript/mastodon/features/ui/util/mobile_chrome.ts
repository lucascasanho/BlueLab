export const MOBILE_CHROME_TOP_TOLERANCE = 8;
export const MOBILE_CHROME_HIDE_DISTANCE = 32;
export const MOBILE_CHROME_SHOW_DISTANCE = 8;

type ScrollDirection = -1 | 0 | 1;

export interface MobileChromeScrollState {
  lastY: number;
  direction: ScrollDirection;
  distance: number;
  hidden: boolean;
}

export const createMobileChromeScrollState = (
  y = 0,
  hidden = false,
): MobileChromeScrollState => ({
  lastY: y,
  direction: 0,
  distance: 0,
  hidden,
});

export const updateMobileChromeScrollState = (
  state: MobileChromeScrollState,
  rawY: number,
  maxY: number,
): MobileChromeScrollState => {
  const y = Math.min(Math.max(rawY, 0), Math.max(maxY, 0));

  if (y <= MOBILE_CHROME_TOP_TOLERANCE) {
    return createMobileChromeScrollState(y);
  }

  const delta = y - state.lastY;
  if (delta === 0) return { ...state, lastY: y };

  const direction: ScrollDirection = delta > 0 ? 1 : -1;
  let distance =
    direction === state.direction
      ? state.distance + Math.abs(delta)
      : Math.abs(delta);
  let hidden = state.hidden;

  if (!hidden && direction === 1 && distance >= MOBILE_CHROME_HIDE_DISTANCE) {
    hidden = true;
    distance = 0;
  } else if (
    hidden &&
    direction === -1 &&
    distance >= MOBILE_CHROME_SHOW_DISTANCE
  ) {
    hidden = false;
    distance = 0;
  }

  return { lastY: y, direction, distance, hidden };
};
