import { fireEvent, render, screen } from '@testing-library/react';

import { Hotkeys } from './index';

describe('Hotkeys', () => {
  test('does not handle shortcuts from descendants of a contenteditable', () => {
    const onNew = vi.fn();

    render(
      <Hotkeys global handlers={{ new: onNew }}>
        <div contentEditable suppressContentEditableWarning>
          <strong data-testid='formatted-text'>formatted text</strong>
        </div>
      </Hotkeys>,
    );

    fireEvent.keyDown(screen.getByTestId('formatted-text'), { key: 'n' });

    expect(onNew).not.toHaveBeenCalled();
  });

  test('handles shortcuts outside editable controls', () => {
    const onNew = vi.fn();

    render(
      <Hotkeys global handlers={{ new: onNew }}>
        <div data-testid='page-content'>page content</div>
      </Hotkeys>,
    );

    fireEvent.keyDown(screen.getByTestId('page-content'), { key: 'n' });

    expect(onNew).toHaveBeenCalledOnce();
  });

  test('does not handle shortcuts from controls inside the BlueLab composer', () => {
    const onNew = vi.fn();

    render(
      <Hotkeys global handlers={{ new: onNew }}>
        <div data-bluelab-composer>
          <button type='button'>Formatting</button>
        </div>
      </Hotkeys>,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Formatting' }), {
      key: 'n',
    });

    expect(onNew).not.toHaveBeenCalled();
  });
});
