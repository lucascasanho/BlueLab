import { vi } from 'vitest';

import { composerOriginFromElement, normalizeComposerEditor } from './composer';

describe('composer preference', () => {
  test('uses BlueLab unless Mastodon was explicitly selected', () => {
    expect(normalizeComposerEditor(undefined)).toBe('bluelab');
    expect(normalizeComposerEditor('bluelab')).toBe('bluelab');
    expect(normalizeComposerEditor('unexpected')).toBe('bluelab');
    expect(normalizeComposerEditor('mastodon')).toBe('mastodon');
  });

  test('captures the visual center of the launcher for the animation', () => {
    const launcher = document.createElement('button');
    vi.spyOn(launcher, 'getBoundingClientRect').mockReturnValue({
      left: 20,
      top: 40,
      width: 100,
      height: 60,
      right: 120,
      bottom: 100,
      x: 20,
      y: 40,
      toJSON: vi.fn(),
    });

    expect(composerOriginFromElement(launcher)).toEqual({ x: 70, y: 70 });
  });
});
