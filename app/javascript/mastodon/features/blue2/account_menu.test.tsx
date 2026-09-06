import { useAccount } from '@/mastodon/hooks/useAccount';
import { useCustomEmojis } from '@/mastodon/hooks/useCustomEmojis';
import { accountFactoryImmutable } from '@/testing/factories';
import { render, screen } from '@/testing/rendering';

import { Blue2AccountMenu } from './account_menu';

vi.mock('@/mastodon/hooks/useAccount');
vi.mock('@/mastodon/hooks/useCustomEmojis');

describe('<Blue2AccountMenu />', () => {
  it('renders the verification badge immediately after the display name', () => {
    const account = accountFactoryImmutable({
      id: '123',
      username: 'alice',
      display_name: 'Alice',
      verified_by_role: true,
    });
    vi.mocked(useAccount).mockReturnValue(account);
    vi.mocked(useCustomEmojis).mockReturnValue({});

    render(<Blue2AccountMenu />);

    const displayName = screen.getByText('Alice');
    const badge = screen.getByRole('button', { name: 'Verified account' });

    expect(displayName.nextElementSibling).toBe(badge);
  });
});
