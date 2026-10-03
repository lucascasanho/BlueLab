import { useCallback, useEffect, useRef, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';
import { Link, useHistory, useLocation } from 'react-router-dom';

import { HashIcon } from '@phosphor-icons/react';

import {
  Blue2PinnedFeedMenu,
  Blue2PinnedFeedTabs,
  useBlue2PinnedFeeds,
} from '@/mastodon/features/blue2/pinned_feeds';
import { Blue2InternalFeed } from '@/mastodon/features/blue2/internal_feed';

// BLUELAB_INTEGRATION: optional BlueLab shell widgets and localized labels.
import { blue2Text } from '@/bluelab/i18n/blue2';
import { openNavigation } from '@/mastodon/actions/navigation';
import { Blue2Announcements } from '@/mastodon/features/blue2/announcements';
import { Blue2HomeFeedTitleBar } from '@/mastodon/features/blue2/feed_header';
import { ColumnSettingsMenu } from '@/mastodon/components/column_header';
import { FeedColumnSettings } from '@/mastodon/features/public_timeline/components/feed_column_settings';
import { HomeColumnSettings } from '@/mastodon/features/home_timeline/components/column_settings_redesign';
import { Blue2ComposeLauncher } from '@/mastodon/features/blue2/compose_launcher';
import { Blue2Navigation } from '@/mastodon/features/blue2/navigation';
import { Blue2RightRail } from '@/mastodon/features/blue2/right_rail';
import { Blue2ScrollToTop } from '@/mastodon/features/blue2/scroll_to_top';
import { ComposeRedesignButton } from '@/mastodon/features/compose/redesign/trigger';
import { RedesignNavigationPanel } from '@/mastodon/features/navigation_panel/redesign';
import { RedesignMobileNavigation } from '@/mastodon/features/navigation_panel/redesign/mobile_nav';
import { ComposePanel } from '@/mastodon/features/ui/components/compose_panel';
import { customFavicon, customInstanceLogo } from '@/mastodon/initial_state';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import MenuIcon from '@/material-icons/400-24px/menu.svg?react';
import { Footer } from 'mastodon/features/custom_homepage/components/footer';
import { Header } from 'mastodon/features/custom_homepage/components/header';

import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useColumnsContext } from '../../util/columns_context';

import mobileChromeClasses from './blue2_mobile_chrome.module.scss';
import searchPortalClasses from './blue2_search_portal.module.scss';
import { MultiColumnContent } from './multi_column_content';
import classes from './redesign.module.scss';
import multiColClasses from './redesign_multicol.module.scss';

const TabsBarPortal: React.FC<React.ComponentProps<'div'>> = (props) => {
  const { setTabsBarElement } = useColumnsContext();

  const setRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (element) {
        setTabsBarElement(element);
      }
    },
    [setTabsBarElement],
  );

  return <div {...props} ref={setRef} />;
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
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);
  const railSwipeOrigin = useRef<{ x: number; y: number } | null>(null);
  const [isBlue2MobileRailOpen, setIsBlue2MobileRailOpen] = useState(false);
  const [
    isBlue2AdvancedNavigationExpanded,
    setIsBlue2AdvancedNavigationExpanded,
  ] = useState(false);
  const isModalOpen = useAppSelector(
    (state) => !state.modal.get('stack').isEmpty(),
  );
  const isMobile = useBreakpoint('openable');
  const isCompactViewport = useBreakpoint('full');
  const useMastodonComposer = useAppSelector(
    (state) => state.compose.get('composer_editor') === 'mastodon',
  );
  const isBlue2 =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';
  const isBlue2MobileLayout =
    isMobile || (isBlue2 && singleColumn && isCompactViewport);
  // The advanced interface uses /deck/* URLs. On Blue2 mobile/tablet, keep
  // the URL intact but interpret that route as its standard mobile equivalent.
  const blue2Pathname =
    isBlue2 && isBlue2MobileLayout && location.pathname.startsWith('/deck')
      ? location.pathname.slice(5) || '/home'
      : location.pathname;
  const isBlue2MessagesPage =
    isBlue2 &&
    (blue2Pathname === '/conversations' ||
      blue2Pathname.startsWith('/conversations/'));
  const isBlue2Home = isBlue2 && blue2Pathname === '/home';
  const isBlue2Global = isBlue2 && blue2Pathname === '/public';
  const isBlue2Search = isBlue2 && blue2Pathname === '/search';
  const isBlue2FeedPage =
    (isBlue2Home || isBlue2Global) && !isBlue2MessagesPage;
  const blue2Brand = customInstanceLogo ?? customFavicon ?? '/favicon.ico';
  const { feeds: pinnedFeeds } = useBlue2PinnedFeeds();
  const [selectedFeedKey, setSelectedFeedKey] = useState<string | null>(
    () => (location.pathname === '/public' ? 'global' : null),
  );

  useEffect(() => {
    setSelectedFeedKey(location.pathname === '/public' ? 'global' : null);
  }, [location.pathname]);

  const selectedPinnedFeed =
    selectedFeedKey && selectedFeedKey !== 'global'
      ? pinnedFeeds.find((feed) => feed.key === selectedFeedKey)
      : undefined;

  const activeFeedTitle =
    selectedFeedKey === 'global'
      ? blue2Text(intl.locale, 'global')
      : selectedPinnedFeed?.title ??
        intl.formatMessage({
          id: 'account.following',
          defaultMessage: 'Following',
        });
  const blue2FeedTitle = isBlue2FeedPage ? activeFeedTitle : null;
  const feedTabsRef = useRef<HTMLDivElement>(null);
  const feedTabsDragRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  } | null>(null);
  const suppressFeedTabsClickRef = useRef(false);
  const [feedTabsDragging, setFeedTabsDragging] = useState(false);

  const handleFeedTabsPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      const scroller = feedTabsRef.current;
      if (!scroller) return;

      feedTabsDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startScrollLeft: scroller.scrollLeft,
        moved: false,
      };

    },
    [],
  );

  const handleFeedTabsPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = feedTabsDragRef.current;
      const scroller = feedTabsRef.current;

      if (!drag || drag.pointerId !== event.pointerId || !scroller) return;

      const deltaX = event.clientX - drag.startX;
      if (Math.abs(deltaX) > 5) {
        drag.moved = true;
        suppressFeedTabsClickRef.current = true;
        setFeedTabsDragging(true);
        event.preventDefault();
      }

      if (drag.moved) {
        scroller.scrollLeft = drag.startScrollLeft - deltaX;
      }
    },
    [],
  );

  const selectFeedTab = useCallback((key: string | null) => {
    setSelectedFeedKey(key);
  }, []);

  const handleFeedTabsPointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = feedTabsDragRef.current;
      const scroller = feedTabsRef.current;

      if (!drag || drag.pointerId !== event.pointerId) return;

      if (drag.moved) {
        suppressFeedTabsClickRef.current = true;
        window.setTimeout(() => {
          suppressFeedTabsClickRef.current = false;
        }, 80);
      }

      feedTabsDragRef.current = null;
      setFeedTabsDragging(false);
    },
    [],
  );



  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsBlue2MobileRailOpen(false);
      setIsBlue2AdvancedNavigationExpanded(false);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [location.pathname]);

  const handleOpenBlue2Navigation = useCallback(() => {
    dispatch(openNavigation());
  }, [dispatch]);

  const handleToggleBlue2AdvancedNavigation = useCallback(() => {
    setIsBlue2AdvancedNavigationExpanded((expanded) => !expanded);
  }, []);

  const handleOpenBlue2MobileRail = useCallback(() => {
    setIsBlue2MobileRailOpen(true);
  }, []);

  const handleCloseBlue2MobileRail = useCallback(() => {
    setIsBlue2MobileRailOpen(false);
  }, []);

  const handleBlue2RailSwipeStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!isBlue2MobileRailOpen) return;

      const touch = event.touches[0];
      if (touch) {
        railSwipeOrigin.current = { x: touch.clientX, y: touch.clientY };
      }
    },
    [isBlue2MobileRailOpen],
  );

  const handleBlue2RailSwipeEnd = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const origin = railSwipeOrigin.current;
      railSwipeOrigin.current = null;

      if (!origin || !isBlue2MobileRailOpen) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - origin.x;
      const deltaY = touch.clientY - origin.y;

      if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
        return;
      }

      const isRtl = document.documentElement.dir === 'rtl';
      const isClosingDirection = isRtl ? deltaX < 0 : deltaX > 0;

      if (isClosingDirection) {
        setIsBlue2MobileRailOpen(false);
      }
    },
    [isBlue2MobileRailOpen],
  );

  const handleSwipeStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!isBlue2FeedPage) return;

      const touch = event.touches[0];
      if (touch) {
        swipeOrigin.current = { x: touch.clientX, y: touch.clientY };
      }
    },
    [isBlue2FeedPage],
  );

  const handleSwipeEnd = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const origin = swipeOrigin.current;
      swipeOrigin.current = null;

      if (!origin || !isBlue2FeedPage) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - origin.x;
      const deltaY = touch.clientY - origin.y;

      if (Math.abs(deltaX) < 70 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
        return;
      }

      if (deltaX < 0 && isBlue2Home) {
        history.push('/public');
      } else if (deltaX > 0 && isBlue2Global) {
        history.push('/home');
      }
    },
    [history, isBlue2FeedPage, isBlue2Global, isBlue2Home],
  );

  if (minimalShell) {
    return (
      <div ref={ref} className={classNames(classes.root, classes.rootMinimal)}>
        {isBlue2MobileLayout && <RedesignMobileNavigation />}
        <div className={classes.main}>
          <Header />

          <TabsBarPortal />

          <div className={classes.content}>{children}</div>

          <Footer />
        </div>
      </div>
    );
  }

  if (singleColumn && isBlue2) {
    return (
      <div className={classNames(classes.root, classes.blue2Root)}>
        {!isBlue2MobileLayout && (
          <div className={classes.blue2NavigationWrapper}>
            <Blue2Navigation />
          </div>
        )}

        {isBlue2MobileLayout ? (
          <div className={mobileChromeClasses.mobileNavigation}>
            <RedesignMobileNavigation />
          </div>
        ) : (
          <ComposeRedesignButton />
        )}

        <main
          className={classNames(
            classes.main,
            classes.blue2Main,
            isBlue2MessagesPage && classes.blue2MessagesMain,
            isBlue2FeedPage && classes.blue2Feed,
            isBlue2FeedPage && classes.blue2Home,
          )}
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
        >
          {isBlue2MobileLayout && (
            <header
              className={classNames(
                classes.blue2MobileUtilityBar,
                mobileChromeClasses.topUtilityBar,
              )}
              style={{ gridTemplateColumns: '88px 1fr 88px' }}
            >
              <button
                type='button'
                className={classes.blue2MobileUtilityButton}
                onClick={handleOpenBlue2Navigation}
                aria-label={intl.formatMessage({
                  id: 'navigation_bar.menu',
                  defaultMessage: 'Menu',
                })}
              >
                <MenuIcon width={28} height={28} fill='currentColor' />
              </button>

              <Link
                to='/home'
                className={classes.blue2MobileUtilityButton}
                style={{ justifySelf: 'center', textDecoration: 'none' }}
                aria-label={intl.formatMessage({
                  id: 'tabs_bar.home',
                  defaultMessage: 'Home',
                })}
              >
                <img
                  src={blue2Brand}
                  alt=''
                  className={classes.blue2MobileBrand}
                />
              </Link>

              <div
                style={{
                  width: 88,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                <Blue2Announcements variant='mobile' />
                <button
                  type='button'
                  className={classes.blue2MobileUtilityButton}
                  onClick={handleOpenBlue2MobileRail}
                  aria-label={blue2Text(intl.locale, 'trendingFeeds')}
                  aria-expanded={isBlue2MobileRailOpen}
                >
                  <HashIcon size={28} />
                </button>
              </div>
            </header>
          )}

          {!isBlue2FeedPage && (
            <div
              className={classNames(
                classes.blue2Portal,
                isBlue2MobileLayout &&
                  isBlue2Search &&
                  searchPortalClasses.searchPortal,
                isBlue2MobileLayout && mobileChromeClasses.portal,
              )}
            >
              <TabsBarPortal />
            </div>
          )}

          {isBlue2FeedPage && (
            <>
              {!isBlue2MobileLayout && (
                <Link
                  to='/home'
                  className={classes.blue2HomeBrandBar}
                  aria-label={intl.formatMessage({
                    id: 'tabs_bar.home',
                    defaultMessage: 'Home',
                  })}
                >
                  <img
                    src={blue2Brand}
                    alt=''
                    className={classes.blue2HomeBrand}
                  />
                </Link>
              )}
              {!isBlue2MobileLayout && blue2FeedTitle && (
                <Blue2HomeFeedTitleBar title={blue2FeedTitle}>
                  <Blue2Announcements variant='mobile' />
                  {selectedFeedKey === null ? (
                    <HomeColumnSettings />
                  ) : selectedFeedKey === 'global' ? (
                    <ColumnSettingsMenu labelPrefix={blue2FeedTitle}>
                      <FeedColumnSettings columnId={undefined} />
                    </ColumnSettingsMenu>
                  ) : null}
                </Blue2HomeFeedTitleBar>
              )}
              <header
                className={classNames(
                  classes.blue2Topbar,
                  isBlue2Home && classes.blue2HomeTopbar,
                  isBlue2MobileLayout && mobileChromeClasses.feedTopBar,
                )}
              >
                <div
                  ref={feedTabsRef}
                  className={classes.blue2TabScroller}
                  data-dragging={feedTabsDragging ? 'true' : undefined}
                  onPointerDown={handleFeedTabsPointerDown}
                  onPointerMove={handleFeedTabsPointerMove}
                  onPointerUp={handleFeedTabsPointerEnd}
                  onPointerCancel={handleFeedTabsPointerEnd}
                >
                  <button
                    type='button'
                    className={
                      selectedFeedKey === null
                        ? classes.blue2TabActive
                        : classes.blue2Tab
                    }
                    onClick={() => selectFeedTab(null)}
                  >
                    <FormattedMessage
                      id='account.following'
                      defaultMessage='Following'
                    />
                  </button>
                  <button
                    type='button'
                    className={
                      selectedFeedKey === 'global'
                        ? classes.blue2TabActive
                        : classes.blue2Tab
                    }
                    onClick={() => selectFeedTab('global')}
                  >
                    {blue2Text(intl.locale, 'global')}
                  </button>
                  <Blue2PinnedFeedTabs
                    activeKey={selectedFeedKey}
                    onSelect={selectFeedTab}
                  />
                </div>
                <Blue2PinnedFeedMenu />
              </header>
              {!isBlue2MobileLayout && <Blue2ComposeLauncher />}
            </>
          )}

          <div className='columns-area columns-area--mobile'>
            {isBlue2FeedPage ? (
              selectedFeedKey === 'global' ? (
                <Blue2InternalFeed type='global' />
              ) : selectedPinnedFeed ? (
                <Blue2InternalFeed
                  type={selectedPinnedFeed.type}
                  id={selectedPinnedFeed.id}
                />
              ) : (
                <Blue2InternalFeed type='home' />
              )
            ) : (
              children
            )}
          </div>
        </main>

        {!isBlue2MobileLayout && (
          <div className={classes.blue2RightRail}>
            <Blue2RightRail />
          </div>
        )}

        {isBlue2MobileLayout && (
          <div
            className={classes.blue2MobileRailOverlay}
            data-is-open={isBlue2MobileRailOpen}
          >
            <button
              type='button'
              className={classes.blue2MobileRailBackdrop}
              onClick={handleCloseBlue2MobileRail}
              aria-label={intl.formatMessage({
                id: 'bundle_modal_error.close',
                defaultMessage: 'Close',
              })}
            />
            <aside
              className={classes.blue2MobileRailDrawer}
              onTouchStart={handleBlue2RailSwipeStart}
              onTouchEnd={handleBlue2RailSwipeEnd}
            >
              <Blue2RightRail variant='mobile' />
            </aside>
          </div>
        )}

        <Blue2ScrollToTop />
      </div>
    );
  }

  if (singleColumn) {
    return (
      <div ref={ref} className={classes.root}>
        <div className={classes.navigationWrapper}>
          <RedesignNavigationPanel />
        </div>
        {useMastodonComposer ? (
          <ComposePanel />
        ) : isMobile ? (
          <RedesignMobileNavigation />
        ) : (
          !isBlue2MessagesPage && <ComposeRedesignButton />
        )}

        <main className={classes.main}>{children}</main>
      </div>
    );
  }

  return (
    <main
      ref={ref}
      className={classNames(multiColClasses.root, {
        unscrollable: isModalOpen,
      })}
      tabIndex={isModalOpen ? undefined : 0}
    >
      {!isMobile && (
        <aside
          className={multiColClasses.navigationRail}
          data-expanded={isBlue2AdvancedNavigationExpanded}
        >
          <Blue2Navigation
            compact
            expanded={isBlue2AdvancedNavigationExpanded}
            onToggleExpanded={handleToggleBlue2AdvancedNavigation}
          />
        </aside>
      )}
      <MultiColumnContent>{children}</MultiColumnContent>
      {/* The Blue2 rail owns the launcher, while this hidden-until-open mount
          owns the shared compose dialog. */}
      <ComposeRedesignButton />
    </main>
  );
};
