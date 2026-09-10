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
vi.mock('@/mastodon/store', () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: (
    selector: (state: {
      followedTags: { tags: never[]; stale: boolean };
    }) => unknown,
  ) => selector({ followedTags: { tags: [], stale: false } }),
}));
vi.mock('./account_card_and_menu', () => ({
  NavigationAccountCardAndMenu: (props: { inSlideOut?: boolean }) => (
    <div
      data-testid='navigation-account-card'
      data-slide-out={props.inSlideOut ? 'true' : 'false'}
    />
  ),
}));
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
  it('keeps the account card available in slide-out mobile navigation', () => {
    render(<RedesignNavigationPanel mode='slide-out' />);

    expect(screen.getByTestId('navigation-account-card')).toBeInTheDocument();
    expect(screen.getByTestId('navigation-account-card')).toHaveAttribute(
      'data-slide-out',
      'true',
    );
  });
});
