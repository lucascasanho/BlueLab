import { IntlProvider } from 'react-intl';

import {
  act,
  fireEvent,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import {
  ComposerBackdrop,
  ComposerResumeButton,
  shouldHideBlue2GlobalTrigger,
  shouldUseDirectBlue2InlineLauncher,
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

  test('restores a minimized Blue 2 composer from its inline mobile launcher', () => {
    const onResume = vi.fn();
    const { container } = render(
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

  test('uses the direct post launcher only for the idle Blue 2 inline mobile FAB', () => {
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
