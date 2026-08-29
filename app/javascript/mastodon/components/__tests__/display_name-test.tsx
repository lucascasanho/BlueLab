import { accountFactoryImmutable } from '@/testing/factories';
import { render, screen } from '@/testing/rendering';

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

  it('still renders the complete handle with the default variant', () => {
    const { container } = render(<DisplayName account={account} />);

    expect(container.querySelector('.display-name__account')?.textContent).toBe(
      '@alice@remote.example',
    );
    expect(container.querySelector('.display-name__domain')?.textContent).toBe(
      '@remote.example',
    );
  });

  it('shows an accessible lock for a private account', () => {
    const lockedAccount = account.set('locked', true);
    render(<DisplayName account={lockedAccount} />);

    expect(screen.getByRole('img', { name: /manually reviews/i })).toBeTruthy();
  });
});
