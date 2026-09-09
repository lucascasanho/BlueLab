import { IntlProvider } from 'react-intl';

import { fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';

import { ComposerBackdrop, ComposerResumeButton } from './trigger';

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

  test('restores a minimized Blue 2 composer from its dedicated launcher', () => {
    const onResume = vi.fn();
    const { container } = render(
      <IntlProvider locale='en'>
        <ComposerResumeButton onResume={onResume} />
      </IntlProvider>,
    );

    const resumeButton = container.querySelector('[data-blue2-compose-resume]');
    expect(resumeButton).not.toBeNull();

    fireEvent.click(resumeButton as Element);
    expect(onResume).toHaveBeenCalledOnce();
  });
});
