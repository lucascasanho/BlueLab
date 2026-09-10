import { fireEvent } from '@testing-library/react';

import { useAccount } from '@/mastodon/hooks/useAccount';
import { useCustomEmojis } from '@/mastodon/hooks/useCustomEmojis';
import {
  PERMISSION_MANAGE_REPORTS,
  PERMISSION_VIEW_DASHBOARD,
} from '@/mastodon/permissions';
import { accountFactoryImmutable } from '@/testing/factories';
import { render, screen } from '@/testing/rendering';

import { NavigationAccountCardAndMenu } from './account_card_and_menu';

vi.mock('@/mastodon/hooks/useAccount');
vi.mock('@/mastodon/hooks/useCustomEmojis');
vi.mock('@/mastodon/store', async () => {
  const store =
    await vi.importActual<Record<string, unknown>>('@/mastodon/store');

  return { ...store, useAppDispatch: () => vi.fn() };
});

describe('<NavigationAccountCardAndMenu />', () => {
  const account = accountFactoryImmutable({
    id: '123',
    username: 'alice',
    acct: 'alice',
    display_name: 'Alice',
    verified_by_role: true,
  });

  beforeEach(() => {
    vi.mocked(useAccount).mockReturnValue(account);
    vi.mocked(useCustomEmojis).mockReturnValue({});
  });

  it('renders the verification badge immediately after the display name', () => {
    render(<NavigationAccountCardAndMenu />);

    const displayName = screen.getByText('Alice');
    const badge = screen.getByRole('button', { name: 'Verified account' });

    expect(displayName.nextElementSibling).toBe(badge);
  });

  it('puts scheduled publications in this account submenu for signed-in users', () => {
    render(<NavigationAccountCardAndMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));

    expect(
      screen
        .getByRole('link', { name: 'Scheduled publications' })
        .getAttribute('href'),
    ).toBe('/scheduled');
  });

  it('opens and closes the dedicated slide-out submenu without the generic mobile menu presentation', () => {
    render(<NavigationAccountCardAndMenu inSlideOut />);

    const trigger = screen.getByRole('button', { name: 'Account settings' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('slide-out-account-menu')).toBeNull();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('slide-out-account-menu')).toBeInTheDocument();
    expect(
      screen
        .getByRole('link', { name: 'Scheduled publications' })
        .getAttribute('href'),
    ).toBe('/scheduled');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('slide-out-account-menu')).toBeNull();
  });

  it('hides moderation and administration from users without permissions', () => {
    render(<NavigationAccountCardAndMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));

    expect(screen.queryByRole('link', { name: 'Moderation' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Administration' })).toBeNull();
  });

  it('reflects granular moderation and administration permissions independently', () => {
    const { unmount } = render(<NavigationAccountCardAndMenu />, {
      permissions: PERMISSION_MANAGE_REPORTS,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));
    expect(
      screen.getByRole('link', { name: 'Moderation' }).getAttribute('href'),
    ).toBe('/admin/reports');
    expect(screen.queryByRole('link', { name: 'Administration' })).toBeNull();
    unmount();

    render(<NavigationAccountCardAndMenu />, {
      permissions: PERMISSION_VIEW_DASHBOARD,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));
    expect(
      screen.getByRole('link', { name: 'Administration' }).getAttribute('href'),
    ).toBe('/admin/dashboard');
    expect(screen.queryByRole('link', { name: 'Moderation' })).toBeNull();
  });
});
