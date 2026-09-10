import { IntlProvider } from 'react-intl';

import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import {
  act,
  fireEvent,
  render as renderWithoutAppContext,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { reducerWithInitialState } from '@/mastodon/reducers';
import {
  minimizeComposerToggle,
  openPreferredComposer,
} from '@/mastodon/reducers/slices/composer';
import { defaultMiddleware } from '@/mastodon/store/store';
import { render } from '@/testing/rendering';

import {
  ComposerBackdrop,
  ComposerResumeButton,
  ComposeRedesignButton,
  shouldHideBlue2GlobalTrigger,
  shouldUseDirectBlue2InlineLauncher,
  useBlue2Theme,
} from './trigger';

vi.mock('./index', () => ({
  RedesignComposeForm: (props: React.ComponentProps<'form'>) => (
    <form {...props} data-testid='redesign-compose-form' />
  ),
}));

const renderBlue2MobileComposerOwner = () => {
  document.body.dataset.theme = 'blue-2';
  const store = configureStore({
    reducer: reducerWithInitialState({
      composer: { displayState: 'hidden' },
      compose: { composer_editor: 'bluelab' },
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware(defaultMiddleware),
  });
  const view = render(
    <Provider store={store}>
      <div data-testid='blue2-mobile-compose-owner'>
        <ComposeRedesignButton inline />
      </div>
    </Provider>,
  );

  return { store, ...view };
};

afterEach(() => {
  delete document.body.dataset.theme;
});

describe('BlueLab composer trigger controls', () => {
  test('minimizes the composer when the backdrop is clicked', () => {
    const onMinimize = vi.fn();
    const { container } = renderWithoutAppContext(
      <ComposerBackdrop onMinimize={onMinimize} />,
    );

    const backdrop = container.querySelector(
      '[data-bluelab-composer-backdrop]',
    );
    expect(backdrop).not.toBeNull();

    fireEvent.click(backdrop as Element);
    expect(onMinimize).toHaveBeenCalledOnce();
  });

  test('restores a minimized Blue 2 composer from its inline mobile launcher', () => {
    const onResume = vi.fn();
    const { container } = renderWithoutAppContext(
      <IntlProvider locale='en'>
        <ComposerResumeButton inline onResume={onResume} />
      </IntlProvider>,
    );

    const resumeButton = container.querySelector('[data-blue2-compose-resume]');
    expect(resumeButton).not.toBeNull();
    expect(resumeButton).toHaveAttribute(
      'data-blue2-compose-resume-inline',
      'true',
    );

    fireEvent.click(resumeButton as Element);
    expect(onResume).toHaveBeenCalledOnce();
  });

  test('keeps the Blue 2 global composer host mounted while showing', () => {
    expect(shouldHideBlue2GlobalTrigger(true, undefined, 'hidden')).toBe(true);
    expect(shouldHideBlue2GlobalTrigger(true, undefined, 'minimized')).toBe(
      true,
    );
    expect(shouldHideBlue2GlobalTrigger(true, undefined, 'showing')).toBe(
      false,
    );
  });

  test('uses a direct launcher only for the idle Blue 2 inline owner', () => {
    expect(shouldUseDirectBlue2InlineLauncher(true, true, 'hidden')).toBe(true);
    expect(shouldUseDirectBlue2InlineLauncher(true, true, 'showing')).toBe(
      false,
    );
    expect(shouldUseDirectBlue2InlineLauncher(true, true, 'minimized')).toBe(
      false,
    );
    expect(shouldUseDirectBlue2InlineLauncher(true, false, 'hidden')).toBe(
      false,
    );
    expect(shouldUseDirectBlue2InlineLauncher(false, true, 'hidden')).toBe(
      false,
    );
  });

  test('keeps one mounted owner through FAB open, minimize, and resume', async () => {
    const { store } = renderBlue2MobileComposerOwner();
    const owner = screen.getByTestId('blue2-mobile-compose-owner');
    const fab = screen.getByRole('button', { name: 'New Post' });

    expect(fab).toHaveAttribute('data-blue2-compose-fab', 'true');
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(fab);

    await waitFor(() => {
      expect(store.getState().composer.displayState).toBe('showing');
    });
    await screen.findByTestId('redesign-compose-form');
    expect(screen.getAllByTestId('redesign-compose-form')).toHaveLength(1);
    expect(
      document.querySelectorAll('[data-bluelab-composer-backdrop]'),
    ).toHaveLength(1);
    expect(owner).toBeInTheDocument();

    fireEvent.click(
      document.querySelector('[data-bluelab-composer-backdrop]') as Element,
    );
    await waitFor(() => {
      expect(store.getState().composer.displayState).toBe('minimized');
    });
    expect(screen.queryByTestId('redesign-compose-form')).toBeNull();
    const resume = screen.getByRole('button', { name: 'Show composer' });
    expect(resume).toHaveAttribute('data-blue2-compose-resume-inline', 'true');
    expect(owner).toBeInTheDocument();

    fireEvent.click(resume);
    await waitFor(() => {
      expect(store.getState().composer.displayState).toBe('showing');
    });
    await screen.findByTestId('redesign-compose-form');
    expect(screen.getAllByTestId('redesign-compose-form')).toHaveLength(1);
    expect(owner).toBeInTheDocument();
  });

  test('the FAB and the working preferred launcher use the same single host', async () => {
    const { store } = renderBlue2MobileComposerOwner();

    act(() => {
      store.dispatch(openPreferredComposer({ origin: { x: 10, y: 20 } }));
    });
    await screen.findByTestId('redesign-compose-form');
    expect(screen.getAllByTestId('redesign-compose-form')).toHaveLength(1);

    act(() => {
      store.dispatch(minimizeComposerToggle());
    });
    expect(screen.getByRole('button', { name: 'Show composer' })).toBeVisible();
  });

  test('reacts when Blue 2 is applied after the compose trigger mounts', async () => {
    delete document.body.dataset.theme;
    const { result } = renderHook(() => useBlue2Theme());

    expect(result.current).toBe(false);

    act(() => {
      document.body.dataset.theme = 'blue-2';
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    act(() => {
      delete document.body.dataset.theme;
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});
