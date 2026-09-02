import { useCallback, useRef } from 'react';

import classNames from 'classnames';
import { Link, useHistory, useLocation } from 'react-router-dom';

import { Blue2ComposeLauncher } from '@/mastodon/features/blue2/compose_launcher';
import { Blue2Navigation } from '@/mastodon/features/blue2/navigation';
import { Blue2RightRail } from '@/mastodon/features/blue2/right_rail';
import { ComposeRedesignButton } from '@/mastodon/features/compose/redesign/trigger';
import { customAppIcon } from '@/mastodon/initial_state';
import { RedesignNavigationPanel } from '@/mastodon/features/navigation_panel/redesign';
import { RedesignMobileNavigation } from '@/mastodon/features/navigation_panel/redesign/mobile_nav';
import { ComposePanel } from '@/mastodon/features/ui/components/compose_panel';
import { useAppSelector } from '@/mastodon/store';
import { Footer } from 'mastodon/features/custom_homepage/components/footer';
import { Header } from 'mastodon/features/custom_homepage/components/header';

import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useColumnsContext } from '../../util/columns_context';

import { MultiColumnContent } from './multi_column_content';
import classes from './redesign.module.scss';

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
  const history = useHistory();
  const location = useLocation();
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);
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

      if (
        Math.abs(deltaX) < 70 ||
        Math.abs(deltaX) < Math.abs(deltaY) * 1.2
      ) {
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

        {isMobile ? <RedesignMobileNavigation /> : <ComposeRedesignButton />}

        <main
          className={classNames(
            classes.main,
            classes.blue2Main,
            isBlue2FeedPage && classes.blue2Home,
          )}
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
        >
          <div className={classNames('tabs-bar__wrapper', classes.blue2Portal)}>
            <TabsBarPortal />
          </div>

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
                  Seguindo
                </Link>
                <Link
                  className={
                    isBlue2Global ? classes.blue2TabActive : classes.blue2Tab
                  }
                  to='/public'
                >
                  Global
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
