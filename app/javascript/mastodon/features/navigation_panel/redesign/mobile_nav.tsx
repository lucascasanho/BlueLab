import { useCallback, useEffect, useRef } from 'react';

import { FormattedMessage } from 'react-intl';

import { useLocation } from 'react-router';

import {
  BellIcon,
  ChatCircleIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  HamburgerIcon,
} from '@phosphor-icons/react';
import { animated, useSpring } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

import { closeNavigation, openNavigation } from '@/mastodon/actions/navigation';
import { Avatar } from '@/mastodon/components/avatar';
import { IconButton } from '@/mastodon/components/button/redesign';
import { FOCUS_TARGET } from '@/mastodon/components/navigation_focus_target';
import { ComposeRedesignButton } from '@/mastodon/features/compose/redesign/trigger';
import { useAccount } from '@/mastodon/hooks/useAccount';
import { useIdentity } from '@/mastodon/identity_context';
import { selectUnreadNotificationGroupsCount } from '@/mastodon/selectors/notifications';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import { RedesignNavigationPanel } from '.';
import classes from './mobile_nav.module.scss';
import { MobileNavLink } from './navigation_link';

export const RedesignMobileNavigation: React.FC<{
  hideMenuButton?: boolean;
}> = ({ hideMenuButton = false }) => {
  const dispatch = useAppDispatch();

  const { accountId, signedIn } = useIdentity();
  const account = useAccount(accountId);

  const notificationsCount = useAppSelector(
    selectUnreadNotificationGroupsCount,
  );

  const handleOpenNavigation = useCallback(() => {
    dispatch(openNavigation());
  }, [dispatch]);

  if (!signedIn) {
    return null;
  }

  return (
    <>
      <nav className={classes.root}>
        <ul className={classes.list}>
          <MobileNavLink to='/home' iconComponent={HouseIcon}>
            <FormattedMessage id='tabs_bar.home' defaultMessage='Home' />
          </MobileNavLink>
          <MobileNavLink
            to={{
              pathname: '/explore',
              state: { focusTarget: FOCUS_TARGET.SEARCH },
            }}
            iconComponent={MagnifyingGlassIcon}
          >
            <FormattedMessage id='tabs_bar.search' defaultMessage='Search' />
          </MobileNavLink>
          <MobileNavLink to='/conversations' iconComponent={ChatCircleIcon}>
            <FormattedMessage
              id='tabs_bar.messages'
              defaultMessage='Messages'
              description='Message refers to a direct message. For languages where this is confusing, "chat" or "direct message" can be used.'
            />
          </MobileNavLink>
          <MobileNavLink
            to='/notifications'
            iconComponent={BellIcon}
            withDot={notificationsCount > 0}
          >
            <FormattedMessage
              id='tabs_bar.notifications'
              defaultMessage='Notifications'
            />
          </MobileNavLink>
          <MobileNavLink
            to={`/@${account?.acct}`}
            customIcon={
              <Avatar size={24} account={account} className={classes.avatar} />
            }
          >
            <FormattedMessage id='tabs_bar.profile' defaultMessage='Profile' />
          </MobileNavLink>
        </ul>
        <ComposeRedesignButton inline />
        {!hideMenuButton && (
          <IconButton // Upstream placeholder; BlueLab 2.0 renders its own top-bar trigger.
            icon={HamburgerIcon}
            variant='solid'
            onClick={handleOpenNavigation}
          >
            Menu
          </IconButton>
        )}
      </nav>
      <SlideOutNavigation />
    </>
  );
};

const MENU_WIDTH = 320;

const SlideOutNavigation: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const blue2SwipeOriginRef = useRef<{ x: number; y: number } | null>(null);

  const isOpen = useAppSelector((state) => state.navigation.open);

  useEffect(() => {
    dispatch(closeNavigation());
  }, [dispatch, location]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (overlayRef.current && e.target === overlayRef.current) {
        dispatch(closeNavigation());
      }
    };

    const handleDocumentKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch(closeNavigation());
      }
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keyup', handleDocumentKeyUp);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keyup', handleDocumentKeyUp);
    };
  }, [dispatch]);

  const isLtrDir = getComputedStyle(document.body).direction !== 'rtl';

  const handleBlue2SwipeStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!isOpen || document.body.dataset.theme !== 'blue-2') return;

      const touch = event.touches[0];
      if (touch) {
        blue2SwipeOriginRef.current = { x: touch.clientX, y: touch.clientY };
      }
    },
    [isOpen],
  );

  const handleBlue2SwipeEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const origin = blue2SwipeOriginRef.current;
      blue2SwipeOriginRef.current = null;

      if (!origin || !isOpen || document.body.dataset.theme !== 'blue-2') {
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - origin.x;
      const deltaY = touch.clientY - origin.y;

      if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
        return;
      }

      const isClosingDirection = isLtrDir ? deltaX < 0 : deltaX > 0;
      if (isClosingDirection) {
        dispatch(closeNavigation());
      }
    },
    [dispatch, isLtrDir, isOpen],
  );

  const OPEN_MENU_OFFSET = isLtrDir ? -MENU_WIDTH : MENU_WIDTH;

  const [{ x }, spring] = useSpring(
    () => ({
      x: isOpen ? 0 : OPEN_MENU_OFFSET,
      onRest: {
        x({ value }: { value: number }) {
          if (value === 0) {
            dispatch(openNavigation());
          } else if (value === OPEN_MENU_OFFSET) {
            dispatch(closeNavigation());
          }
        },
      },
    }),
    [isOpen],
  );

  const bind = useDrag(
    ({
      last,
      offset: [xOffset],
      velocity: [xVelocity],
      direction: [xDirection],
      cancel,
    }) => {
      const logicalXDirection = isLtrDir ? -xDirection : xDirection;
      const logicalXOffset = isLtrDir ? -xOffset : xOffset;
      const hasReachedDragThreshold = logicalXOffset < -70;

      if (hasReachedDragThreshold) {
        cancel();
      }

      if (last) {
        const isAboveOpenThreshold = logicalXOffset > MENU_WIDTH / 2;
        const isQuickFlick = xVelocity > 0.5 && logicalXDirection > 0;

        if (isAboveOpenThreshold || isQuickFlick) {
          void spring.start({ x: OPEN_MENU_OFFSET });
        } else {
          void spring.start({ x: 0 });
        }
      } else {
        void spring.start({ x: xOffset, immediate: true });
      }
    },
    {
      from: () => [x.get(), 0],
      axis: 'x',
      filterTaps: true,
      bounds: isLtrDir ? { right: 0 } : { left: 0 },
      rubberband: true,
    },
  );

  const previouslyFocusedElementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (isOpen && overlay) {
      const firstLink = overlay.querySelector<HTMLAnchorElement>('a');
      previouslyFocusedElementRef.current =
        document.activeElement as HTMLElement;
      firstLink?.focus();
    } else {
      previouslyFocusedElementRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div
      className={classes.slideOutWrapper}
      data-is-open={isOpen}
      ref={overlayRef}
      onTouchStart={handleBlue2SwipeStart}
      onTouchEnd={handleBlue2SwipeEnd}
    >
      <animated.div className={classes.slideOut} {...bind()} style={{ x }}>
        <RedesignNavigationPanel mode='slide-out' />
      </animated.div>
    </div>
  );
};
