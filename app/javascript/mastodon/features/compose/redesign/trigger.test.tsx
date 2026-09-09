import { IntlProvider } from 'react-intl';

import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import {
  ComposerBackdrop,
  ComposerResumeButton,
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
