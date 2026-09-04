import {
  createMobileChromeScrollState,
  updateMobileChromeScrollState,
} from './mobile_chrome';

describe('mobile chrome scroll visibility', () => {
  test('requires a deliberate downward scroll before hiding', () => {
    let state = createMobileChromeScrollState(20);
    state = updateMobileChromeScrollState(state, 40, 1000);
    expect(state.hidden).toBe(false);

    state = updateMobileChromeScrollState(state, 52, 1000);
    expect(state.hidden).toBe(true);
  });

  test('returns after a short upward scroll', () => {
    let state = { ...createMobileChromeScrollState(100), hidden: true };
    state = updateMobileChromeScrollState(state, 95, 1000);
    expect(state.hidden).toBe(true);

    state = updateMobileChromeScrollState(state, 92, 1000);
    expect(state.hidden).toBe(false);
  });

  test('resets accumulated distance when direction changes', () => {
    let state = createMobileChromeScrollState(20);
    state = updateMobileChromeScrollState(state, 45, 1000);
    state = updateMobileChromeScrollState(state, 40, 1000);
    state = updateMobileChromeScrollState(state, 47, 1000);

    expect(state.hidden).toBe(false);
    expect(state.distance).toBe(7);
  });

  test('always shows near the top and clamps iOS overscroll', () => {
    const state = {
      ...createMobileChromeScrollState(100),
      hidden: true,
    };

    expect(updateMobileChromeScrollState(state, -24, 1000)).toEqual(
      createMobileChromeScrollState(0),
    );
  });

  test('shows at the exact top tolerance', () => {
    const state = {
      ...createMobileChromeScrollState(100),
      hidden: true,
    };

    expect(updateMobileChromeScrollState(state, 8, 1000).hidden).toBe(false);
  });

  test('clamps scroll positions beyond the document end', () => {
    const state = createMobileChromeScrollState(990);
    const next = updateMobileChromeScrollState(state, 1100, 1000);

    expect(next.lastY).toBe(1000);
  });

  test('can synchronize a new baseline without changing visibility', () => {
    expect(createMobileChromeScrollState(240, true)).toEqual({
      lastY: 240,
      direction: 0,
      distance: 0,
      hidden: true,
    });
  });
});
