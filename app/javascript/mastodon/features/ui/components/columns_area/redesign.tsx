import { useCallback, useEffect, useRef, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import { HamburgerIcon, HashIcon } from '@phosphor-icons/react';
import classNames from 'classnames';
import { Link, useHistory, useLocation } from 'react-router-dom';

import { openNavigation } from '@/mastodon/actions/navigation';
import { setNotificationsFilter } from '@/mastodon/actions/notification_groups';
import { Blue2ComposeLauncher } from '@/mastodon/features/blue2/compose_launcher';
import { blue2Text } from '@/mastodon/features/blue2/locale';
import { Blue2Navigation } from '@/mastodon/features/blue2/navigation';
import { Blue2RightRail } from '@/mastodon/features/blue2/right_rail';
import { Blue2ScrollToTop } from '@/mastodon/features/blue2/scroll_to_top';
import { ComposeRedesignButton } from '@/mastodon/features/compose/redesign/trigger';
import { useIdentity } from '@/mastodon/identity_context';
import { customAppIcon } from '@/mastodon/initial_state';
import { RedesignNavigationPanel } from '@/mastodon/features/navigation_panel/redesign';
import { RedesignMobileNavigation } from '@/mastodon/features/navigation_panel/redesign/mobile_nav';
import {
  selectSettingsNotificationsQuickFilterActive,
  selectSettingsNotificationsQuickFilterAdvanced,
} from '@/mastodon/selectors/settings';
import { ComposePanel } from '@/mastodon/features/ui/components/compose_panel';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import { Footer } from 'mastodon/features/custom_homepage/components/footer';
import { Header } from 'mastodon/features/custom_homepage/components/header';

import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useColumnsContext } from '../../util/columns_context';

import { MultiColumnContent } from './multi_column_content';
import classes from './redesign.module.scss';

const FIREHOSE_SWIPE_ROUTES = [
  '/public/local',
  '/public/remote',
  '/public',
] as const;

const EXPLORE_SWIPE_ROUTES = [
  '/explore',
  '/explore/tags',
  '/explore/suggestions',
  '/explore/links',
] as const;

const EXPLORE_SIGNED_OUT_SWIPE_ROUTES = [
  '/explore',
  '/explore/tags',
  '/explore/links',
] as const;

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

export const ColumnsAreaRedesign: React.FC<{
  singleColumn?: boolean;
  minimalShell?: boolean;
  children: React.ReactElement | React.ReactElement[];
  ref?: React.Ref<HTMLDivElement>;
}> = ({ children, minimalShell, singleColumn, ref }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const history = useHistory();
  const location = useLocation();
  const { signedIn } = useIdentity();
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);
  const previousPath = useRef(location.pathname);
  const [isBlue2MobileRailOpen, setIsBlue2MobileRailOpen] = useState(false);
  const [publicSwipeMode, setPublicSwipeMode] = useState<'home' | 'firehose'>(
    'home',
  );
  const isModalOpen = useAppSelector(
    (state) => !state.modal.get('stack').isEmpty(),
  );
  const notificationsFilter = useAppSelector(
    selectSettingsNotificationsQuickFilterActive,
  );
  const notificationsAdvancedMode = useAppSelector(
    selectSettingsNotificationsQuickFilterAdvanced,
  );
  const isMobile = useBreakpoint('openable');
  const useMastodonComposer = useAppSelector(
    (state) => state.compose.get('composer_editor') === 'mastodon',
  );
  const isBlue2 =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';
  const isBlue2Home = isBlue2 && location.pathname === '/home';
  const isBlue2Global = isBlue2 && location.pathname === '/public';
  const isBlue2FeedPage = isBlue2Home || isBlue2Global;
  const isBlue2Notifications =
    isBlue2 &&
    location.pathname === '/notifications' &&
    !notificationsAdvancedMode;
  const isBlue2Firehose =
    isBlue2 &&
    (location.pathname === '/public/local' ||
      location.pathname === '/public/remote' ||
      (isBlue2Global && publicSwipeMode === 'firehose'));
  const isBlue2Explore =
    isBlue2 &&
    (location.pathname === '/explore' ||
      location.pathname === '/explore/posts' ||
      location.pathname === '/explore/tags' ||
      location.pathname === '/explore/suggestions' ||
      location.pathname === '/explore/links');
  const isBlue2SwipePage =
    isBlue2FeedPage ||
    isBlue2Notifications ||
    isBlue2Firehose ||
    isBlue2Explore;

  useEffect(() => {
    const previous = previousPath.current;

    if (location.pathname === '/public') {
      if (previous === '/public/local' || previous === '/public/remote') {
        setPublicSwipeMode('firehose');
      } else {
        setPublicSwipeMode('home');
      }
    }

    previousPath.current = location.pathname;
    setIsBlue2MobileRailOpen(false);
  }, [location.pathname]);

  const handleOpenBlue2Navigation = useCallback(() => {
    dispatch(openNavigation());
  }, [dispatch]);

  const handleSwipeStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      swipeOrigin.current = null;

      if (
        !isMobile ||
        !isBlue2SwipePage ||
        isModalOpen ||
        isBlue2MobileRailOpen ||
        event.touches.length !== 1
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.closest?.(
          'button, input, textarea, select, [contenteditable="true"], [role="slider"], [data-bluelab-composer], .video-player, .audio-player',
        )
      ) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) return;

      // Leave the screen edges to the browser/OS back-forward gestures.
      if (touch.clientX <= 24 || touch.clientX >= window.innerWidth - 24) {
        return;
      }

      swipeOrigin.current = { x: touch.clientX, y: touch.clientY };
    },
    [
      isBlue2MobileRailOpen,
      isBlue2SwipePage,
      isMobile,
      isModalOpen,
    ],
  );

  const handleSwipeEnd = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const origin = swipeOrigin.current;
      swipeOrigin.current = null;

      if (!origin || !isMobile || !isBlue2SwipePage) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - origin.x;
      const deltaY = touch.clientY - origin.y;

      if (
        Math.abs(deltaX) < 70 ||
        Math.abs(deltaX) < Math.abs(deltaY) * 1.2
      ) {
        return;
      }

      const movingForward = deltaX < 0;

      if (isBlue2Notifications) {
        if (movingForward && notificationsFilter === 'all') {
          void dispatch(
            setNotificationsFilter({ filterType: 'mention' }),
          );
        } else if (!movingForward && notificationsFilter === 'mention') {
          void dispatch(setNotificationsFilter({ filterType: 'all' }));
        }
        return;
      }

      if (isBlue2Firehose) {
        const currentIndex = FIREHOSE_SWIPE_ROUTES.indexOf(
          location.pathname as (typeof FIREHOSE_SWIPE_ROUTES)[number],
        );
        if (currentIndex === -1) return;

        const nextIndex = currentIndex + (movingForward ? 1 : -1);
        const nextRoute = FIREHOSE_SWIPE_ROUTES[nextIndex];
        if (nextRoute) {
          history.push(nextRoute);
        }
        return;
      }

      if (isBlue2Explore) {
        const routes = signedIn
          ? EXPLORE_SWIPE_ROUTES
          : EXPLORE_SIGNED_OUT_SWIPE_ROUTES;
        const normalizedPath =
          location.pathname === '/explore/posts'
            ? '/explore'
            : location.pathname;
        const currentIndex = routes.indexOf(
          normalizedPath as (typeof routes)[number],
        );
        if (currentIndex === -1) return;

        const nextIndex = currentIndex + (movingForward ? 1 : -1);
        const nextRoute = routes[nextIndex];
        if (nextRoute) {
          history.push(nextRoute);
        }
        return;
      }

      if (movingForward && isBlue2Home) {
        history.push('/public');
      } else if (!movingForward && isBlue2Global) {
        history.push('/home');
      }
    },
    [
      dispatch,
      history,
      isBlue2Explore,
      isBlue2Firehose,
      isBlue2Global,
      isBlue2Home,
      isBlue2Notifications,
      isBlue2SwipePage,
      isMobile,
      location.pathname,
      notificationsFilter,
      signedIn,
    ],
  );

  if (minimalShell) {
    return (
      <div className={classes.root}>
        <div className={classes.main}>
          <Header />

          <div className='tabs-bar__wrapper'>
            <TabsBarPortal />
          </div>

          <div className='columns-area columns-area--mobile'>{children}</div>

          <Footer />
        </div>
      </div>
    );
  }

  if (singleColumn && isBlue2) {
    return (
      <div className={classNames(classes.root, classes.blue2Root)}>
        {!isMobile && (
          <div className={classes.blue2NavigationWrapper}>
            <Blue2Navigation />
          </div>
        )}

        {isMobile ? (
          <RedesignMobileNavigation hideMenuButton />
        ) : (
          <ComposeRedesignButton />
        )}

        <main
          className={classNames(
            classes.main,
            classes.blue2Main,
            isBlue2FeedPage && classes.blue2Home,
          )}
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
        >
          {isMobile && (
            <header className={classes.blue2MobileUtilityBar}>
              <button
                type='button'
                className={classes.blue2MobileUtilityButton}
                onClick={handleOpenBlue2Navigation}
                aria-label={intl.formatMessage({
                  id: 'navigation_bar.menu',
                  defaultMessage: 'Menu',
                })}
              >
                <HamburgerIcon size={28} />
              </button>

              <img
                src={customAppIcon ?? '/favicon.ico'}
                alt=''
                className={classes.blue2MobileBrand}
              />

              <button
                type='button'
                className={classes.blue2MobileUtilityButton}
                onClick={() => setIsBlue2MobileRailOpen(true)}
                aria-label={blue2Text(intl.locale, 'trendingFeeds')}
                aria-expanded={isBlue2MobileRailOpen}
              >
                <HashIcon size={28} />
              </button>
            </header>
          )}

          {!isBlue2FeedPage && (
            <div className={classes.blue2Portal}>
              <TabsBarPortal />
            </div>
          )}

          {isBlue2FeedPage && (
            <>
              <header className={classes.blue2Topbar}>
                <img
                  src={customAppIcon ?? '/favicon.ico'}
                  alt=''
                  className={classes.blue2Brand}
                />

                <Link
                  className={
                    isBlue2Home ? classes.blue2TabActive : classes.blue2Tab
                  }
                  to='/home'
                >
                  <FormattedMessage
                    id='account.following'
                    defaultMessage='Following'
                  />
                </Link>
                <Link
                  className={
                    isBlue2Global ? classes.blue2TabActive : classes.blue2Tab
                  }
                  to='/public'
                >
                  {blue2Text(intl.locale, 'global')}
                </Link>
              </header>
              {isBlue2Home && !isMobile && <Blue2ComposeLauncher />}
            </>
          )}

          <div className='columns-area columns-area--mobile'>{children}</div>
        </main>

        {!isMobile && (
          <div className={classes.blue2RightRail}>
            <Blue2RightRail />
          </div>
        )}

        {isMobile && (
          <div
            className={classes.blue2MobileRailOverlay}
            data-is-open={isBlue2MobileRailOpen}
            onClick={() => setIsBlue2MobileRailOpen(false)}
          >
            <aside
              className={classes.blue2MobileRailDrawer}
              onClick={(event) => event.stopPropagation()}
            >
              <Blue2RightRail />
            </aside>
          </div>
        )}

        <Blue2ScrollToTop />
      </div>
    );
  }

  if (singleColumn) {
    return (
      <div className={classes.root}>
        <div className={classes.navigationWrapper}>
          <RedesignNavigationPanel />
        </div>
        {useMastodonComposer ? (
          <ComposePanel />
        ) : isMobile ? (
          <RedesignMobileNavigation />
        ) : (
          <ComposeRedesignButton />
        )}

        <main className={classes.main}>
          <div className='tabs-bar__wrapper'>
            <TabsBarPortal />
          </div>

          <div className='columns-area columns-area--mobile'>{children}</div>
        </main>
      </div>
    );
  }

  return (
    <main
      className={classNames('columns-area', { unscrollable: isModalOpen })}
      ref={ref}
      tabIndex={isModalOpen ? undefined : 0}
    >
      <MultiColumnContent>{children}</MultiColumnContent>
    </main>
  );
};
