import { accountFactoryImmutable } from '@/testing/factories';
import { fireEvent, render, screen } from '@/testing/rendering';

import { DisplayName } from '../display_name';

describe('<DisplayName />', () => {
  const account = accountFactoryImmutable({
    username: 'alice',
    acct: 'alice@remote.example',
    display_name: 'Alice',
  });

  it('renders a short handle without changing the display name', () => {
    render(<DisplayName account={account} variant='shortHandle' />);

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('@alice')).toBeTruthy();
    expect(screen.queryByText('@alice@remote.example')).toBeNull();
  });

  it('renders a simplified handle and expands it on request', () => {
    const { container } = render(<DisplayName account={account} />);

    expect(container.querySelector('.display-name__account')?.textContent).toBe(
      '@alice',
    );
    const toggle = screen.getByRole('button', { name: /show full username/i });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(container.querySelector('.display-name__account')?.textContent).toBe(
      '@alice@remote.example',
    );
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('does not add an incomplete domain when the local domain is unavailable', () => {
    const localAccount = account.set('acct', 'alice');
    const { container } = render(<DisplayName account={localAccount} />);

    fireEvent.click(
      screen.getByRole('button', { name: /show full username/i }),
    );

    expect(container.querySelector('.display-name__account')?.textContent).toBe(
      '@alice',
    );
  });

  it('expands the handle without activating an enclosing timeline link', () => {
    const onClick = vi.fn();
    const { container } = render(
      <a href='/@alice' onClick={onClick}>
        <DisplayName account={account} />
      </a>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /show full username/i }),
    );

    expect(onClick).not.toHaveBeenCalled();
    expect(container.querySelector('.display-name__account')?.textContent).toBe(
      '@alice@remote.example',
    );
  });

  it('shows an accessible lock for a private account', () => {
    const lockedAccount = account.set('locked', true);
    const { container } = render(<DisplayName account={lockedAccount} />);

    expect(screen.getByRole('img', { name: /manually reviews/i })).toBeTruthy();
    expect(
      container.querySelector('.display-name__name .display-name__locked'),
    ).toBeTruthy();
    expect(
      container.querySelector('.display-name__account .display-name__locked'),
    ).toBeNull();
  });

  it('shows the lock beside the name in the simple profile variant', () => {
    const lockedAccount = account.set('locked', true);
    const { container } = render(
      <DisplayName account={lockedAccount} variant='simple' />,
    );

    expect(
      container.querySelector('.display-name__name .display-name__locked'),
    ).toBeTruthy();
  });

  it('does not reserve a lock element for a public account', () => {
    const { container } = render(<DisplayName account={account} />);

    expect(container.querySelector('.display-name__locked')).toBeNull();
  });
});
