import { IntlProvider } from 'react-intl';

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import {
  ComposerBackdrop,
  ComposerModeMenuButton,
  shouldHideBlue2GlobalTrigger,
  useBlue2Theme,
} from './trigger';

afterEach(() => {
  delete document.body.dataset.theme;
});

describe('BlueLab composer trigger controls', () => {
  test('minimizes the composer when the backdrop is clicked', () => {
    const onMinimize = vi.fn();
    const { container } = render(<ComposerBackdrop onMinimize={onMinimize} />);

    const backdrop = container.querySelector(
      '[data-bluelab-composer-backdrop]',
    );
    expect(backdrop).not.toBeNull();

    fireEvent.click(backdrop as Element);
    expect(onMinimize).toHaveBeenCalledOnce();
  });

  test('opens the Post and Message chooser for a minimized Blue 2 launcher', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <IntlProvider locale='en'>
        <ComposerModeMenuButton inline resume onSelect={onSelect} />
      </IntlProvider>,
    );

    const trigger = container.querySelector('[data-blue2-compose-resume]');
    expect(trigger).not.toBeNull();
    expect(trigger).toHaveAttribute(
      'data-blue2-compose-resume-inline',
      'true',
    );

    fireEvent.click(trigger as Element);
    expect(onSelect).not.toHaveBeenCalled();

    expect(screen.getByText('Post')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Post'));
    expect(onSelect).toHaveBeenCalledOnce();
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
