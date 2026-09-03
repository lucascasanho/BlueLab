import { useCallback, useEffect, useRef, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';
import { Link, useHistory, useLocation } from 'react-router-dom';

import { HamburgerIcon, HashIcon } from '@phosphor-icons/react';

import { openNavigation } from '@/mastodon/actions/navigation';
import { Blue2ComposeLauncher } from '@/mastodon/features/blue2/compose_launcher';
import { blue2Text } from '@/mastodon/features/blue2/locale';
import { Blue2Navigation } from '@/mastodon/features/blue2/navigation';
import { Blue2RightRail } from '@/mastodon/features/blue2/right_rail';
import { Blue2ScrollToTop } from '@/mastodon/features/blue2/scroll_to_top';
import { ComposeRedesignButton } from '@/mastodon/features/compose/redesign/trigger';
import { RedesignNavigationPanel } from '@/mastodon/features/navigation_panel/redesign';
import { RedesignMobileNavigation } from '@/mastodon/features/navigation_panel/redesign/mobile_nav';
import { ComposePanel } from '@/mastodon/features/ui/components/compose_panel';
import { customFavicon, customInstanceLogo } from '@/mastodon/initial_state';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import { Footer } from 'mastodon/features/custom_homepage/components/footer';
import { Header } from 'mastodon/features/custom_homepage/components/header';

import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useColumnsContext } from '../../util/columns_context';

import { MultiColumnContent } from './multi_column_content';
import classes from './redesign.module.scss';

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
  const [isBlue2MobileRailOpen, setIsBlue2MobileRailOpen] = useState(false);
  const isModalOpen = useAppSelector(
    (state) => !state.modal.get('stack').isEmpty(),
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
  const blue2Brand = customInstanceLogo ?? customFavicon ?? '/favicon.ico';

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsBlue2MobileRailOpen(false);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [location.pathname]);

  const handleOpenBlue2Navigation = useCallback(() => {
    dispatch(openNavigation());
  }, [dispatch]);

  const handleOpenBlue2MobileRail = useCallback(() => {
    setIsBlue2MobileRailOpen(true);
  }, []);

  const handleCloseBlue2MobileRail = useCallback(() => {
    setIsBlue2MobileRailOpen(false);
  }, []);

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
      <div className={classes.root}>
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

              <img src={blue2Brand} alt='' className={classes.blue2MobileBrand} />

              <button
                type='button'
                className={classes.blue2MobileUtilityButton}
                onClick={handleOpenBlue2MobileRail}
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
                <img src={blue2Brand} alt='' className={classes.blue2Brand} />

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
            <aside className={classes.blue2MobileRailDrawer}>
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
          <TabsBarPortal className={classes.columnHeader} />

          <div className={classes.content}>{children}</div>
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
