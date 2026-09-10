import { fireEvent, waitFor } from '@testing-library/react';

import { useBreakpoint } from '@/mastodon/features/ui/hooks/useBreakpoint';
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
vi.mock('@/mastodon/features/ui/hooks/useBreakpoint', () => ({
  useBreakpoint: vi.fn(),
}));
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
    vi.mocked(useBreakpoint).mockReturnValue(false);
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
    render(
      <div data-testid='static-sidebar-ancestor'>
        <NavigationAccountCardAndMenu />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));

    const menu = screen.getByTestId('account-menu');
    expect(menu.parentElement).toBe(document.body);
    expect(screen.getByTestId('static-sidebar-ancestor')).not.toContainElement(
      menu,
    );
    expect(
      screen
        .getByRole('link', { name: 'Scheduled publications' })
        .getAttribute('href'),
    ).toBe('/scheduled');
  });

  it('hides moderation and administration from users without permissions', () => {
    render(<NavigationAccountCardAndMenu inSlideOut />);
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));

    expect(screen.queryByRole('link', { name: 'Moderation' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Administration' })).toBeNull();
  });

  it('reflects granular moderation and administration permissions independently', () => {
    const { unmount } = render(<NavigationAccountCardAndMenu inSlideOut />, {
      permissions: PERMISSION_MANAGE_REPORTS,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));
    expect(
      screen.getByRole('link', { name: 'Moderation' }).getAttribute('href'),
    ).toBe('/admin/reports');
    expect(screen.queryByRole('link', { name: 'Administration' })).toBeNull();
    unmount();

    render(<NavigationAccountCardAndMenu inSlideOut />, {
      permissions: PERMISSION_VIEW_DASHBOARD,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));
    expect(
      screen.getByRole('link', { name: 'Administration' }).getAttribute('href'),
    ).toBe('/admin/dashboard');
    expect(screen.queryByRole('link', { name: 'Moderation' })).toBeNull();
  });

  it('uses a dedicated body-portal popover in the mobile drawer and isolates drawer gestures', async () => {
    vi.mocked(useBreakpoint).mockReturnValue(true);
    const drawerTouchStart = vi.fn();
    render(
      <div data-testid='drawer-ancestor' onTouchStart={drawerTouchStart}>
        <NavigationAccountCardAndMenu inSlideOut />
      </div>,
    );
    const trigger = screen.getByRole('button', { name: 'Account settings' });

    fireEvent.touchStart(trigger);
    expect(drawerTouchStart).not.toHaveBeenCalled();
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByTestId('slide-out-account-menu');
    expect(menu.parentElement).toBe(document.body);
    expect(screen.getByTestId('drawer-ancestor')).not.toContainElement(menu);
    expect(menu).toHaveAttribute('data-popover-placement');
    expect(menu).not.toHaveAttribute('popover');
    expect(menu.style.position).toBe('fixed');
    expect(menu.querySelector(':scope > ul')).not.toBeNull();
    expect(
      screen
        .getByRole('link', { name: 'Scheduled publications' })
        .getAttribute('href'),
    ).toBe('/scheduled');
    expect(screen.queryByRole('link', { name: 'Profile' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Bookmarks' })).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    fireEvent.pointerDown(menu);
    expect(screen.getByTestId('slide-out-account-menu')).toBeInTheDocument();

    fireEvent.keyUp(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('slide-out-account-menu')).toBeNull();
    });
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(screen.queryByTestId('slide-out-account-menu')).toBeNull();
    });
  });
});
