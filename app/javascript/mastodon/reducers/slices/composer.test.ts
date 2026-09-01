import { Map as ImmutableMap } from 'immutable';

import { vi } from 'vitest';

import { quoteCompose } from '@/mastodon/actions/compose_typed';
import { browserHistory } from '@/mastodon/components/router';
import type { Status } from '@/mastodon/models/status';

import { composerOriginFromElement, normalizeComposerEditor } from './composer';

interface TestState {
  composer: { displayState: 'hidden' | 'showing' };
  getIn: (path: string[]) => unknown;
}

interface TestAction {
  type: string;
}
type TestThunk = (dispatch: TestDispatch, getState: () => TestState) => unknown;
type TestDispatch = (action: TestAction | TestThunk) => unknown;

const quoteWithEditor = (editor: 'bluelab' | 'mastodon') => {
  const dispatched: TestAction[] = [];
  const state: TestState = {
    composer: { displayState: 'hidden' },
    getIn: (path) => {
      if (path.join('.') === 'compose.composer_editor') return editor;
      if (path.join('.') === 'compose.mounted') return false;
      return undefined;
    },
  };
  const getState = () => state;
  const dispatch: TestDispatch = vi.fn((action: TestAction | TestThunk) => {
    if (typeof action === 'function') return action(dispatch, getState);
    dispatched.push(action);
    if (action.type === 'composer/showComposer') {
      state.composer.displayState = 'showing';
    }
    return action;
  });

  const status = ImmutableMap({ id: 'quoted-status' }) as unknown as Status;
  quoteCompose(status)(dispatch as never, getState as never);

  return dispatched;
};

afterEach(() => {
  vi.restoreAllMocks();
});

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

  test('opens a quote in the BlueLab composer when it is preferred', () => {
    const historyPush = vi.spyOn(browserHistory, 'push');

    expect(quoteWithEditor('bluelab')).toContainEqual({
      type: 'composer/showComposer',
    });
    expect(historyPush).not.toHaveBeenCalled();
  });

  test('opens a quote in the Mastodon composer when it is preferred', () => {
    const historyPush = vi.spyOn(browserHistory, 'push');

    expect(quoteWithEditor('mastodon')).not.toContainEqual({
      type: 'composer/showComposer',
    });
    expect(historyPush).toHaveBeenCalledWith(
      '/publish',
      expect.objectContaining({ focusTarget: false }),
    );
  });
});
