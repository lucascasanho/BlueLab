import { fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';

import { ComposerBackdrop } from './trigger';

describe('BlueLab composer backdrop', () => {
  test('minimizes the composer when clicked', () => {
    const onMinimize = vi.fn();
    const { container } = render(<ComposerBackdrop onMinimize={onMinimize} />);

    const backdrop = container.querySelector(
      '[data-bluelab-composer-backdrop]',
    );
    expect(backdrop).not.toBeNull();

    fireEvent.click(backdrop as Element);
    expect(onMinimize).toHaveBeenCalledOnce();
  });
});
