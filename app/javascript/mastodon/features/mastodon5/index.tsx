import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import { Link, NavLink } from 'react-router-dom';

import { fetchLists } from '@/mastodon/actions/lists';
import { fetchFollowedHashtags } from '@/mastodon/actions/tags_typed';
import { Avatar } from '@/mastodon/components/avatar';
import { Badge } from '@/mastodon/components/badge';
import { DisplayName } from '@/mastodon/components/display_name';
import { useAccountHandle } from '@/mastodon/components/display_name/default';
import { ComposeRedesignButton } from '@/mastodon/features/compose/redesign/trigger';
import { useBreakpoint } from '@/mastodon/features/ui/hooks/useBreakpoint';
import { useColumnsContext } from '@/mastodon/features/ui/util/columns_context';
import { useAccount } from '@/mastodon/hooks/useAccount';
import { useIdentity } from '@/mastodon/identity_context';
import {
  customAppIcon,
  customFavicon,
  customInstanceLogo,
  domain,
  title,
} from '@/mastodon/initial_state';
import {
  composerOriginFromElement,
  openNewComposer,
} from '@/mastodon/reducers/slices/composer';
import { getOrderedLists } from '@/mastodon/selectors/lists';
import { selectUnreadNotificationGroupsCount } from '@/mastodon/selectors/notifications';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import AddIcon from '@/material-icons/400-24px/add.svg?react';
import ArrowBackIcon from '@/material-icons/400-24px/arrow_back.svg?react';
import BookmarkIcon from '@/material-icons/400-24px/bookmark.svg?react';
import ChatBubbleIcon from '@/material-icons/400-24px/chat_bubble.svg?react';
import EditSquareIcon from '@/material-icons/400-24px/edit_square.svg?react';
import HomeIcon from '@/material-icons/400-24px/home.svg?react';
import MenuIcon from '@/material-icons/400-24px/menu.svg?react';
import NotificationsIcon from '@/material-icons/400-24px/notifications.svg?react';
import PersonIcon from '@/material-icons/400-24px/person.svg?react';
import PublicIcon from '@/material-icons/400-24px/public.svg?react';
import SearchIcon from '@/material-icons/400-24px/search.svg?react';
import SettingsIcon from '@/material-icons/400-24px/settings.svg?react';
import StarIcon from '@/material-icons/400-24px/star.svg?react';
import TagIcon from '@/material-icons/400-24px/tag.svg?react';

import { MultiColumnContent } from '../ui/components/columns_area/multi_column_content';

import classes from './index.module.scss';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const NavigationLink: React.FC<{
  to: string;
  icon: IconComponent;
  children: React.ReactNode;
  exact?: boolean;
  badgeCount?: number;
}> = ({ to, icon: Icon, children, exact, badgeCount }) => (
  <NavLink
    to={to}
    exact={exact}
    className={classes.link}
    activeClassName={classes.linkActive}
  >
    <Icon className={classes.icon} aria-hidden='true' />
    <span className={classes.label}>{children}</span>
    {!!badgeCount && badgeCount > 0 && (
      <Badge variant='accent' label={badgeCount} className={classes.badge} />
    )}
  </NavLink>
);

export const Mastodon5Navigation: React.FC<{
  mode?: 'desktop' | 'drawer';
}> = ({ mode = 'desktop' }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const { accountId, signedIn } = useIdentity();
  const account = useAccount(accountId);
  const notificationsCount = useAppSelector(
    selectUnreadNotificationGroupsCount,
  );
  const customFeeds = useAppSelector(getOrderedLists);
  const { tags: followedHashtags, stale: followedHashtagsStale } =
    useAppSelector((state) => state.followedTags);
  const serverName = title ?? domain ?? 'Mastodon';
  const brand =
    customInstanceLogo ?? customAppIcon ?? customFavicon ?? '/favicon.ico';

  useEffect(() => {
    if (signedIn) {
      void dispatch(fetchLists());
    }
  }, [dispatch, signedIn]);

  useEffect(() => {
    if (signedIn && followedHashtagsStale) {
      void dispatch(fetchFollowedHashtags());
    }
  }, [dispatch, followedHashtagsStale, signedIn]);

  const handleNewPost = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      dispatch(
        openNewComposer({
          type: 'post',
          origin: composerOriginFromElement(event.currentTarget),
        }),
      );
    },
    [dispatch],
  );

  const profileUrl = account?.acct ? '/@' + account.acct : '/home';
  const handle = useAccountHandle(account);

  return (
    <nav
      className={classes.navigationRoot}
      data-mode={mode}
      aria-label={intl.formatMessage({
        id: 'navigation_bar.main',
        defaultMessage: 'Main',
      })}
    >
      <header className={classes.header}>
        <Link to='/home' className={classes.brand}>
          <img src={brand} alt='' className={classes.brandIcon} />
          <span className={classes.brandText}>
            <strong>{serverName}</strong>
            <span className={classes.poweredBy}>Powered by Mastodon</span>
          </span>
        </Link>
      </header>

      {signedIn ? (
        <>
          <div className={classes.primary}>
            <button
              type='button'
              className={classes.newPost}
              onClick={handleNewPost}
            >
              <EditSquareIcon aria-hidden='true' />
              <span>
                <FormattedMessage
                  id='tabs_bar.publish'
                  defaultMessage='New Post'
                />
              </span>
            </button>

            <NavigationLink to='/home' icon={HomeIcon} exact>
              <FormattedMessage id='tabs_bar.home' defaultMessage='Home' />
            </NavigationLink>

            <NavigationLink to='/explore' icon={SearchIcon}>
              <FormattedMessage
                id='tabs_bar.explore'
                defaultMessage='Explore'
              />
            </NavigationLink>

            <NavigationLink to='/public/local' icon={PublicIcon}>
              <FormattedMessage
                id='tabs_bar.fediverse_feeds'
                defaultMessage='Fediverse Feeds'
              />
            </NavigationLink>

            <NavigationLink
              to='/notifications'
              icon={NotificationsIcon}
              badgeCount={notificationsCount}
            >
              <FormattedMessage
                id='tabs_bar.notifications'
                defaultMessage='Notifications'
              />
            </NavigationLink>

            <NavigationLink to='/conversations' icon={ChatBubbleIcon}>
              <FormattedMessage
                id='tabs_bar.messages'
                defaultMessage='Messages'
              />
            </NavigationLink>

            <section className={classes.section}>
              <div className={classes.sectionTitle}>
                <FormattedMessage
                  id='tabs_bar.custom_feeds'
                  defaultMessage='Custom Feeds'
                />
                <Link
                  to='/lists/new'
                  className={classes.sectionAction}
                  aria-label={intl.formatMessage({
                    id: 'tabs_bar.create_custom_feed',
                    defaultMessage: 'Create Feed',
                  })}
                >
                  <AddIcon aria-hidden='true' />
                </Link>
              </div>
              {customFeeds.length > 0 ? (
                <div className={classes.feedList}>
                  {customFeeds.map((feed) => (
                    <NavLink
                      key={feed.id}
                      to={'/lists/' + feed.id}
                      className={classes.subLink}
                      activeClassName={classes.subLinkActive}
                    >
                      {feed.title}
                    </NavLink>
                  ))}
                </div>
              ) : (
                <Link to='/lists/new' className={classes.emptyLink}>
                  <FormattedMessage
                    id='tabs_bar.create_custom_feed'
                    defaultMessage='Create Feed'
                  />
                </Link>
              )}
            </section>

            {followedHashtags.length > 0 && (
              <section className={classes.section}>
                <div className={classes.sectionTitle}>
                  <FormattedMessage
                    id='tabs_bar.followed_hashtags'
                    defaultMessage='Followed Hashtags'
                  />
                </div>
                <div className={classes.feedList}>
                  {followedHashtags.slice(0, 5).map((tag) => (
                    <NavLink
                      key={tag.name}
                      to={'/tags/' + encodeURIComponent(tag.name)}
                      className={classes.subLink}
                      activeClassName={classes.subLinkActive}
                    >
                      <TagIcon aria-hidden='true' />
                      <span>#{tag.name}</span>
                    </NavLink>
                  ))}
                  {followedHashtags.length > 5 && (
                    <Link to='/followed_tags' className={classes.emptyLink}>
                      <FormattedMessage
                        id='tabs_bar.followed_tags_view_all'
                        defaultMessage='View all'
                      />
                    </Link>
                  )}
                </div>
              </section>
            )}
          </div>

          <footer className={classes.footer}>
            <div className={classes.footerLinks}>
              <NavigationLink to='/favourites' icon={StarIcon}>
                <FormattedMessage
                  id='navigation_bar.favourites'
                  defaultMessage='Favorites'
                />
              </NavigationLink>
              <NavigationLink to='/bookmarks' icon={BookmarkIcon}>
                <FormattedMessage id='tabs_bar.saved' defaultMessage='Saved' />
              </NavigationLink>
              <NavigationLink to={profileUrl} icon={PersonIcon} exact>
                <FormattedMessage
                  id='tabs_bar.profile'
                  defaultMessage='Profile'
                />
              </NavigationLink>
              <Link to='/settings/preferences' className={classes.link}>
                <SettingsIcon className={classes.icon} aria-hidden='true' />
                <span className={classes.label}>
                  <FormattedMessage
                    id='navigation_bar.preferences'
                    defaultMessage='Preferences'
                  />
                </span>
              </Link>
            </div>

            {account && (
              <Link to={profileUrl} className={classes.account}>
                <Avatar account={account} size={40} />
                <span className={classes.accountText}>
                  <strong>
                    <DisplayName variant='simple' account={account} />
                  </strong>
                  <span>{handle}</span>
                </span>
              </Link>
            )}
          </footer>
        </>
      ) : (
        <div className={classes.loggedOut}>
          <Link to='/about'>
            <FormattedMessage
              id='getting_started.onboarding'
              defaultMessage='Learn more'
            />
          </Link>
        </div>
      )}
    </nav>
  );
};

const MobileLink: React.FC<{
  to: string;
  icon: IconComponent;
  label: string;
  exact?: boolean;
}> = ({ to, icon: Icon, label, exact }) => (
  <NavLink
    to={to}
    exact={exact}
    className={classes.mobileItem}
    activeClassName={classes.mobileItemActive}
    aria-label={label}
  >
    <Icon aria-hidden='true' />
    <span className='sr-only'>{label}</span>
  </NavLink>
);

const Mastodon5MobileNavigation: React.FC = () => {
  const intl = useIntl();
  const { accountId, signedIn } = useIdentity();
  const account = useAccount(accountId);
  const brand =
    customInstanceLogo ?? customAppIcon ?? customFavicon ?? '/favicon.ico';
  const serverName = title ?? domain ?? 'Mastodon';
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  if (!signedIn) {
    return (
      <div className={classes.mobileChrome}>
        <header className={classes.mobileTopBar}>
          <Link to='/home' className={classes.mobileBrand}>
            <img src={brand} alt='' />
            <span>{serverName}</span>
          </Link>
        </header>
      </div>
    );
  }

  return (
    <div className={classes.mobileChrome}>
      <header className={classes.mobileTopBar}>
        <button
          type='button'
          className={classes.mobileMenuButton}
          onClick={openDrawer}
          aria-label={intl.formatMessage({
            id: 'navigation_bar.menu',
            defaultMessage: 'Menu',
          })}
          aria-expanded={drawerOpen}
        >
          <MenuIcon aria-hidden='true' />
        </button>

        <Link to='/home' className={classes.mobileBrand}>
          <img src={brand} alt='' />
          <span>{serverName}</span>
        </Link>

        {account ? (
          <Link
            to={'/@' + account.acct}
            className={classes.mobileProfileButton}
            aria-label={intl.formatMessage({
              id: 'tabs_bar.profile',
              defaultMessage: 'Profile',
            })}
          >
            <Avatar account={account} size={32} />
          </Link>
        ) : (
          <span />
        )}
      </header>

      <div className={classes.mobileComposerLauncher}>
        <ComposeRedesignButton inline />
      </div>

      <nav className={classes.mobileBottomBar} aria-label='Primary navigation'>
        <MobileLink
          to='/home'
          icon={HomeIcon}
          label={intl.formatMessage({
            id: 'tabs_bar.home',
            defaultMessage: 'Home',
          })}
          exact
        />
        <MobileLink
          to='/explore'
          icon={SearchIcon}
          label={intl.formatMessage({
            id: 'tabs_bar.explore',
            defaultMessage: 'Explore',
          })}
        />
        <MobileLink
          to='/conversations'
          icon={ChatBubbleIcon}
          label={intl.formatMessage({
            id: 'tabs_bar.messages',
            defaultMessage: 'Messages',
          })}
        />
        <MobileLink
          to='/notifications'
          icon={NotificationsIcon}
          label={intl.formatMessage({
            id: 'tabs_bar.notifications',
            defaultMessage: 'Notifications',
          })}
        />
        <MobileLink
          to={account ? '/@' + account.acct : '/home'}
          icon={PersonIcon}
          label={intl.formatMessage({
            id: 'tabs_bar.profile',
            defaultMessage: 'Profile',
          })}
        />
      </nav>

      {drawerOpen && (
        <div className={classes.drawerLayer}>
          <button
            type='button'
            className={classes.drawerBackdrop}
            onClick={closeDrawer}
            aria-label={intl.formatMessage({
              id: 'bundle_modal_error.close',
              defaultMessage: 'Close',
            })}
          />
          <aside className={classes.drawer}>
            <button
              type='button'
              className={classes.drawerClose}
              onClick={closeDrawer}
              aria-label={intl.formatMessage({
                id: 'bundle_modal_error.close',
                defaultMessage: 'Close',
              })}
            >
              <ArrowBackIcon aria-hidden='true' />
            </button>
            <Mastodon5Navigation mode='drawer' />
          </aside>
        </div>
      )}
    </div>
  );
};

const TabsBarPortal = () => {
  const { setTabsBarElement } = useColumnsContext();

  const setRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (element) {
        setTabsBarElement(element);
      }
    },
    [setTabsBarElement],
  );

  return <div id='tabs-bar__portal' ref={setRef} />;
};

export const ColumnsAreaMastodon5: React.FC<{
  singleColumn?: boolean;
  minimalShell?: boolean;
  children: React.ReactElement | React.ReactElement[];
  ref?: React.Ref<HTMLDivElement>;
}> = ({ children, minimalShell, singleColumn, ref }) => {
  const isMobile = useBreakpoint('openable');

  if (minimalShell) {
    return (
      <div ref={ref} className={classes.minimal}>
        <main className={classes.minimalMain}>{children}</main>
      </div>
    );
  }

  if (!singleColumn && !isMobile) {
    return (
      <main ref={ref} className={classes.advancedRoot}>
        <aside className={classes.advancedNavigation}>
          <Mastodon5Navigation />
        </aside>
        <section className={classes.advancedContent}>
          <MultiColumnContent>{children}</MultiColumnContent>
        </section>
        <ComposeRedesignButton />
      </main>
    );
  }

  return (
    <div ref={ref} className={classes.root}>
      <aside className={classes.navigation}>
        <Mastodon5Navigation />
      </aside>

      <main className={classes.main}>
        <div className={classes.pageHeader}>
          <TabsBarPortal />
        </div>
        <div className={classes.content}>
          <div className='columns-area columns-area--mobile'>{children}</div>
        </div>
      </main>

      <Mastodon5MobileNavigation />
      <div className={classes.desktopComposer}>
        <ComposeRedesignButton />
      </div>
    </div>
  );
};
