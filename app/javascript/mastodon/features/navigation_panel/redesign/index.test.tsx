import { fireEvent } from '@testing-library/react';

import { useAccount } from '@/mastodon/hooks/useAccount';
import { useCustomEmojis } from '@/mastodon/hooks/useCustomEmojis';
import {
  PERMISSION_MANAGE_REPORTS,
  PERMISSION_VIEW_DASHBOARD,
} from '@/mastodon/permissions';
import { accountFactoryImmutable } from '@/testing/factories';
import { render, screen } from '@/testing/rendering';

import { RedesignNavigationPanel } from './index';

vi.mock('@/mastodon/actions/lists', () => ({
  fetchLists: vi.fn(() => ({ type: 'TEST_FETCH_LISTS' })),
}));
vi.mock('@/mastodon/actions/navigation', () => ({
  closeNavigation: vi.fn(() => ({ type: 'TEST_CLOSE_NAVIGATION' })),
}));
vi.mock('@/mastodon/actions/tags_typed', () => ({
  fetchFollowedHashtags: vi.fn(() => ({ type: 'TEST_FETCH_TAGS' })),
}));
vi.mock('@/mastodon/hooks/useScrollSensor', () => ({
  useScrollSensor: vi.fn(() => ({ sensor: null, isInViewport: true })),
}));
vi.mock('@/mastodon/features/ui/hooks/useBreakpoint', () => ({
  useBreakpoint: () => true,
}));
vi.mock('@/mastodon/hooks/useAccount', () => ({ useAccount: vi.fn() }));
vi.mock('@/mastodon/hooks/useCustomEmojis', () => ({
  useCustomEmojis: vi.fn(),
}));
vi.mock('@/mastodon/reducers/slices/composer', () => ({
  composerOriginFromElement: vi.fn(() => null),
  openPreferredComposer: vi.fn(() => ({ type: 'TEST_OPEN_COMPOSER' })),
  selectComposerEditor: vi.fn(() => 'redesign'),
}));
vi.mock('@/mastodon/selectors/lists', () => ({
  getOrderedLists: vi.fn(() => []),
}));
vi.mock('@/mastodon/selectors/notifications', () => ({
  selectUnreadNotificationGroupsCount: vi.fn(() => 0),
}));
vi.mock('@/mastodon/store', async () => {
  const typedFunctions = await vi.importActual<Record<string, unknown>>(
    '@/mastodon/store/typed_functions',
  );

  return {
    ...typedFunctions,
    useAppDispatch: () => vi.fn(),
    useAppSelector: (
      selector: (state: {
        followedTags: { tags: never[]; stale: boolean };
        meta: { get: () => string };
      }) => unknown,
    ) =>
      selector({
        followedTags: { tags: [], stale: false },
        meta: { get: () => 'native' },
      }),
  };
});
vi.mock('./footer_links', () => ({
  NavigationFooterLinks: () => null,
}));
vi.mock('./header', () => ({
  NavigationHeader: () => null,
}));
vi.mock('./list_section', () => ({
  ListSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock('./logged_out_info', () => ({
  LoggedOutInfo: () => null,
}));
vi.mock('./navigation_link', () => ({
  NavigationLink: ({ children }: { children: React.ReactNode }) => (
    <li>{children}</li>
  ),
}));

describe('<RedesignNavigationPanel />', () => {
  const account = accountFactoryImmutable({
    id: '123',
    username: 'alice',
    acct: 'alice',
    display_name: 'Alice',
  });

  beforeEach(() => {
    vi.mocked(useAccount).mockReturnValue(account);
    vi.mocked(useCustomEmojis).mockReturnValue({});
  });

  it('opens the desktop-style account submenu from the slide-out mobile panel', () => {
    render(<RedesignNavigationPanel mode='slide-out' />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Account settings' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    expect(screen.getByTestId('slide-out-account-menu')).toBeInTheDocument();
    expect(
      screen
        .getByRole('link', { name: 'Scheduled publications' })
        .getAttribute('href'),
    ).toBe('/scheduled');
    expect(screen.queryByRole('link', { name: 'Moderation' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Administration' })).toBeNull();

    fireEvent.click(trigger);
    expect(screen.queryByTestId('slide-out-account-menu')).toBeNull();
  });

  it('reflects permitted administration and moderation links in the slide-out panel', () => {
    render(<RedesignNavigationPanel mode='slide-out' />, {
      permissions: PERMISSION_MANAGE_REPORTS | PERMISSION_VIEW_DASHBOARD,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));

    expect(
      screen.getByRole('link', { name: 'Moderation' }).getAttribute('href'),
    ).toBe('/admin/reports');
    expect(
      screen.getByRole('link', { name: 'Administration' }).getAttribute('href'),
    ).toBe('/admin/dashboard');
  });
});
