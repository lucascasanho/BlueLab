import { IntlProvider } from 'react-intl';

import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import {
  changeCompose,
  changeComposeSchedule,
} from '@/mastodon/actions/compose';
import { reducerWithInitialState } from '@/mastodon/reducers';
import { defaultMiddleware } from '@/mastodon/store/store';

import { ComposeFooter } from './footer';

vi.mock('./emoji', () => ({
  ComposeEmojiButton: () => <button type='button'>Emoji</button>,
}));

const renderFooter = () => {
  const store = configureStore({
    reducer: reducerWithInitialState({ compose: { text: 'First post' } }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware(defaultMiddleware),
  });
  const result = render(
    <Provider store={store}>
      <IntlProvider locale='en'>
        <ComposeFooter onEmojiPick={vi.fn()} />
      </IntlProvider>
    </Provider>,
  );
  return { store, ...result };
};

describe('BlueLab compose primary actions', () => {
  test('keeps the circular thread button immediately before Publish and adds at the end', () => {
    const { container, store } = renderFooter();
    const group = container.querySelector('[data-compose-primary-actions]');
    const add = screen.getByRole('button', {
      name: 'Add another post to this thread',
    });
    const publish = screen.getByRole('button', { name: 'Publish' });

    expect(group?.children[0]).toBe(add);
    expect(group?.children[1]).toBe(publish);
    expect(add.className).toContain('threadAddButton');

    fireEvent.click(add);
    fireEvent.click(add);
    const items = store.getState().compose.get('thread_items') as {
      size: number;
    };
    expect(items.size).toBe(2);
  });

  test('keeps the same adjacency when scheduling', () => {
    const { container, store } = renderFooter();
    act(() => {
      store.dispatch(
        changeComposeSchedule(
          new Date(Date.now() + 600_000).toISOString(),
          'America/Cuiaba',
        ),
      );
    });

    const group = container.querySelector('[data-compose-primary-actions]');
    const add = screen.getByRole('button', {
      name: 'Add another post to this thread',
    });
    const schedule = screen.getByRole('button', { name: 'Schedule' });
    expect(group?.children[0]).toBe(add);
    expect(group?.children[1]).toBe(schedule);
  });

  test('disables submit when an appended item is blank', () => {
    const { store } = renderFooter();
    const add = screen.getByRole('button', {
      name: 'Add another post to this thread',
    });
    fireEvent.click(add);
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Publish' })
        .disabled,
    ).toBe(true);

    store.dispatch(changeCompose('Still the first post'));
  });
});
