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
    render(<DisplayName account={account} />);

    expect(screen.getByText('@alice@remote.example')).toBeTruthy();
  });
});
