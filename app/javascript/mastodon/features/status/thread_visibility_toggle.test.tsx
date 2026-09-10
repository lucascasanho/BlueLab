import { fireEvent } from '@testing-library/react';

import { render, screen } from '@/testing/rendering';

import { ThreadVisibilityToggle } from './thread_visibility_toggle';

describe('<ThreadVisibilityToggle />', () => {
  it('uses the compact Portuguese labels for the whole conversation toggle', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <ThreadVisibilityToggle hidden onClick={onClick} />,
      { locale: 'pt-BR' },
    );

    const showAllButton = screen.getByRole('button', { name: 'Mostrar tudo' });
    expect(showAllButton).toHaveAttribute('title', 'Mostrar tudo');

    fireEvent.click(showAllButton);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<ThreadVisibilityToggle hidden={false} onClick={onClick} />);

    expect(
      screen.getByRole('button', { name: 'Mostrar menos' }),
    ).toHaveAttribute('title', 'Mostrar menos');
  });

  it('keeps concise English fallback labels', () => {
    const onClick = vi.fn();

    render(<ThreadVisibilityToggle hidden={false} onClick={onClick} />);

    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });
});
