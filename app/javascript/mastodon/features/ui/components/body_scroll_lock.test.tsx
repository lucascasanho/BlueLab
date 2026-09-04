import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import { act, cleanup, render } from '@testing-library/react';

import { reducerWithInitialState } from '@/mastodon/reducers';
import { defaultMiddleware } from '@/mastodon/store/store';

import { BodyScrollLock } from './body_scroll_lock';

const renderWithComposerState = (displayState: 'hidden' | 'showing') => {
  const reducer = reducerWithInitialState({ composer: { displayState } });
  const store = configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware(defaultMiddleware),
  });

  const view = render(
    <Provider store={store}>
      <BodyScrollLock />
    </Provider>,
  );

  return { store, view };
};

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('has-modal');
});

describe('BodyScrollLock', () => {
  test('does not lock background scrolling while the BlueLab composer is expanded', () => {
    renderWithComposerState('showing');

    expect(document.documentElement.classList.contains('has-modal')).toBe(
      false,
    );
  });

  test('does not lock background scrolling while the composer is hidden', () => {
    renderWithComposerState('hidden');

    expect(document.documentElement.classList.contains('has-modal')).toBe(
      false,
    );
  });

  test('restores background scrolling when the composer closes', () => {
    const { store } = renderWithComposerState('showing');

    expect(document.documentElement.classList.contains('has-modal')).toBe(
      false,
    );

    act(() => {
      store.dispatch({ type: 'composer/hideComposer' });
    });

    expect(document.documentElement.classList.contains('has-modal')).toBe(
      false,
    );
  });
});
