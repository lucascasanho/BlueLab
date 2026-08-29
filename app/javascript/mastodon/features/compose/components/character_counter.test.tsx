import { shouldShowCharacterCounter } from './character_counter';

describe('shouldShowCharacterCounter', () => {
  it('keeps the counter visible when the category setting is disabled', () => {
    expect(shouldShowCharacterCounter(false, 10, 500)).toBe(true);
  });

  it('hides the permanent counter when configured', () => {
    expect(shouldShowCharacterCounter(true, 10, 500)).toBe(false);
  });

  it('shows an over-limit error even when the permanent counter is hidden', () => {
    expect(shouldShowCharacterCounter(true, 501, 500)).toBe(true);
  });
});
