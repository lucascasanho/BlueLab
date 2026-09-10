import { useLocation } from 'react-router';

import { fireEvent } from '@testing-library/react';

import { useAccount } from '@/mastodon/hooks/useAccount';
import { useCustomEmojis } from '@/mastodon/hooks/useCustomEmojis';
import {
  PERMISSION_MANAGE_REPORTS,
  PERMISSION_VIEW_DASHBOARD,
} from '@/mastodon/permissions';
import { accountFactoryImmutable } from '@/testing/factories';
import { render, screen } from '@/testing/rendering';

import { Blue2AccountMenu } from './account_menu';

vi.mock('@/mastodon/hooks/useAccount');
vi.mock('@/mastodon/hooks/useCustomEmojis');
vi.mock('@/mastodon/store', async () => {
  const store =
    await vi.importActual<Record<string, unknown>>('@/mastodon/store');

  return { ...store, useAppDispatch: () => vi.fn() };
});

const LocationProbe: React.FC = () => {
  const location = useLocation();
  return <output data-testid='location'>{location.pathname}</output>;
};

describe('<Blue2AccountMenu />', () => {
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

  const openAccountMenu = () => {
    fireEvent.click(
      screen.getByRole('button', { name: 'Account settings', expanded: false }),
    );
  };

  it('renders the verification badge immediately after the display name', () => {
    render(<Blue2AccountMenu />);

    const displayName = screen.getByText('Alice');
    const badge = screen.getByRole('button', { name: 'Verified account' });

    expect(displayName.nextElementSibling).toBe(badge);
  });

  it('mirrors the standard account submenu links', () => {
    render(<Blue2AccountMenu />);
    openAccountMenu();

    const expectedLinks = [
      ['Edit profile', '/profile/edit'],
      ['Preferences', '/settings/preferences'],
      ['Collections', '/@alice/collections'],
      ['Scheduled publications', '/scheduled'],
      ['Favorites', '/favourites'],
      ['Follows and followers', '/relationships'],
      ['Blocked users', '/blocks'],
    ] as const;

    expectedLinks.forEach(([name, href]) => {
      expect(screen.getByRole('menuitem', { name }).getAttribute('href')).toBe(
        href,
      );
    });
    expect(
      screen.getByRole('menuitem', { name: 'Logout' }),
    ).toBeInTheDocument();
  });

  it('portals the submenu outside the navigation subtree', () => {
    const { container } = render(<Blue2AccountMenu />);
    openAccountMenu();

    const menu = screen.getByRole('menu');

    expect(document.body.contains(menu)).toBe(true);
    expect(container.contains(menu)).toBe(false);
  });

  it('keeps the portaled submenu mounted through pointerdown and navigates on click', () => {
    render(
      <>
        <Blue2AccountMenu />
        <LocationProbe />
      </>,
    );
    openAccountMenu();

    const favorites = screen.getByRole('menuitem', { name: 'Favorites' });

    fireEvent.pointerDown(favorites);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(favorites);
    expect(screen.getByTestId('location')).toHaveTextContent('/favourites');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('keeps action buttons alive through pointerdown before their click handler', () => {
    render(<Blue2AccountMenu />);
    openAccountMenu();

    const logout = screen.getByRole('menuitem', { name: 'Logout' });

    fireEvent.pointerDown(logout);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(logout);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('hides moderation and administration from users without permissions', () => {
    render(<Blue2AccountMenu />);
    openAccountMenu();

    expect(screen.queryByRole('menuitem', { name: 'Moderation' })).toBeNull();
    expect(
      screen.queryByRole('menuitem', { name: 'Administration' }),
    ).toBeNull();
  });

  it('reflects granular moderation and administration permissions independently', () => {
    const { unmount } = render(<Blue2AccountMenu />, {
      permissions: PERMISSION_MANAGE_REPORTS,
    });
    openAccountMenu();
    expect(
      screen.getByRole('menuitem', { name: 'Moderation' }).getAttribute('href'),
    ).toBe('/admin/reports');
    expect(
      screen.queryByRole('menuitem', { name: 'Administration' }),
    ).toBeNull();
    unmount();

    render(<Blue2AccountMenu />, {
      permissions: PERMISSION_VIEW_DASHBOARD,
    });
    openAccountMenu();
    expect(
      screen
        .getByRole('menuitem', { name: 'Administration' })
        .getAttribute('href'),
    ).toBe('/admin/dashboard');
    expect(screen.queryByRole('menuitem', { name: 'Moderation' })).toBeNull();
  });
});
