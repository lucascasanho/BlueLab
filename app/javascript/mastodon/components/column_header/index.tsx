import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

import classNames from 'classnames';
import { useLocation } from 'react-router';

import {
  ArrowLeftIcon,
  ArrowUpIcon,
  DotsThreeIcon,
  ListIcon,
} from '@phosphor-icons/react';
import type { DistributedOmit } from 'type-fest';

import { openNavigation } from '@/mastodon/actions/navigation';
import {
  Menu,
  MenuItem,
  MenuItemDivider,
  MenuList,
  MenuTrigger,
} from '@/mastodon/components/menu';
import { getColumnSkipLinkId } from '@/mastodon/features/ui/components/skip_links';
import { useBreakpoint } from '@/mastodon/features/ui/hooks/useBreakpoint';
import { useBlue2ColumnPinning } from '@/mastodon/features/ui/util/blue2_column_pinning';
import { useAppDispatch } from '@/mastodon/store';
import { hasReactChildren } from '@/mastodon/utils/has_react_children';

import type { IconButtonProps } from '../button/redesign';
import { Button, IconButton } from '../button/redesign';
import { useColumn, useColumnIndexContext } from '../column/context';
import { NavigationFocusTarget } from '../navigation_focus_target';
import type { LocationState } from '../router';
import { useAppHistory } from '../router';

import classes from './styles.module.scss';

export { ColumnSettingsMenu } from './column_settings_menu';

export interface ColumnHeaderProps {
  title: React.ReactNode;
  // Set to auto to display the back button based on
  // the `fromMastodon` location state
  withBackButton?: boolean | 'auto';
  onBackButtonClick?: () => void;
  withUnreadMarker?: boolean;
  extraButtons?: React.ReactNode;
  extraStickyContent?: React.ReactNode;
  className?: string;
}

export const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  title,
  withBackButton,
  onBackButtonClick,
  withUnreadMarker,
  extraButtons,
  extraStickyContent,
  className,
  ...props
}: ColumnHeaderProps) => {
  const columnIndex = useColumnIndexContext();
  const location = useLocation<LocationState>();
  const isSingleColumnSubpage =
    typeof document !== 'undefined' &&
    document.body.classList.contains('layout-single-column') &&
    location.pathname !== '/' &&
    location.pathname !== '/home';
  const hasBackButton =
    typeof onBackButtonClick === 'function' ||
    withBackButton === true ||
    isSingleColumnSubpage ||
    (withBackButton === 'auto' && location.state?.fromMastodon);
  const hasExtraStickyContent = hasReactChildren(extraStickyContent);
  const { canPin, pinned, onPin, onMove } = useBlue2ColumnPinning();
  const showBlue2ColumnSettings = canPin && !hasReactChildren(extraButtons);

  const history = useAppHistory();

  const handleBlue2ColumnPin = useCallback(() => {
    if (!pinned) {
      history.replace('/');
    }
    onPin();
  }, [onPin, pinned, history]);

  const handleBlue2ColumnMoveLeft = useCallback(() => {
    onMove(-1);
  }, [onMove]);

  const handleBlue2ColumnMoveRight = useCallback(() => {
    onMove(1);
  }, [onMove]);

  const blue2ColumnSettings = showBlue2ColumnSettings ? (
    <Menu>
      <MenuTrigger as={ColumnHeaderButton} icon={DotsThreeIcon}>
        {pinned ? (
          <FormattedMessage id='column_header.unpin' defaultMessage='Unpin' />
        ) : (
          <FormattedMessage id='column_header.pin' defaultMessage='Pin' />
        )}
      </MenuTrigger>
      <MenuList
        placement='bottom-end'
        strategy='fixed'
        portal
        mobilePresentation='popover'
        constrainToViewport
        scrollable
      >
        <MenuItem onClick={handleBlue2ColumnPin}>
          {pinned ? (
            <FormattedMessage id='column_header.unpin' defaultMessage='Unpin' />
          ) : (
            <FormattedMessage id='column_header.pin' defaultMessage='Pin' />
          )}
        </MenuItem>
        {pinned && <MenuItemDivider />}
        {pinned && (
          <>
            <MenuItem onClick={handleBlue2ColumnMoveLeft}>
              <FormattedMessage
                id='column_header.moveLeft_settings'
                defaultMessage='Move column to the left'
              />
            </MenuItem>
            <MenuItem onClick={handleBlue2ColumnMoveRight}>
              <FormattedMessage
                id='column_header.moveRight_settings'
                defaultMessage='Move column to the right'
              />
            </MenuItem>
          </>
        )}
      </MenuList>
    </Menu>
  ) : null;

  const { isScrolledToTop, scrollTop } = useColumn();

  const handleHeaderClick = useCallback<React.MouseEventHandler>(
    (e) => {
      // Only scroll to top when clicking outside
      // of the leftButton/rightButtons containers
      if (
        e.target instanceof Element &&
        !e.target.matches(`
          .${classes.leftButton},
          .${classes.leftButton} *,
          .${classes.rightButtons},
          .${classes.rightButtons} *`)
      ) {
        scrollTop();
      }
    },
    [scrollTop],
  );

  const handleHeaderKeyDown = useCallback<React.KeyboardEventHandler>(
    (event) => {
      if (
        event.target !== event.currentTarget ||
        (event.key !== 'Enter' && event.key !== ' ')
      ) {
        return;
      }

      event.preventDefault();
      scrollTop();
    },
    [scrollTop],
  );

  const hasScrollToTopButton = !isScrolledToTop && withUnreadMarker;
  const headerRef = useTrackColumnHeaderHeight();

  return (
    <header
      {...props}
      role='button'
      tabIndex={0}
      onClick={handleHeaderClick}
      onKeyDown={handleHeaderKeyDown}
      ref={headerRef}
      className={classNames(
        className,
        classes.root,
        isScrolledToTop && classes.rootScrolledToTop,
        hasExtraStickyContent && classes.withStickyContent,
      )}
    >
      <div className={classes.layout} data-has-unread={withUnreadMarker}>
        {hasBackButton ? (
          <BackButton onClick={onBackButtonClick} />
        ) : (
          <MobileMenuButton />
        )}
        <NavigationFocusTarget className={classes.title}>
          <button
            type='button'
            onClick={scrollTop}
            id={getColumnSkipLinkId(columnIndex)}
          >
            {title}
          </button>
        </NavigationFocusTarget>
        {(hasReactChildren(extraButtons) || showBlue2ColumnSettings) && (
          <div className={classes.rightButtons}>
            {extraButtons}
            {blue2ColumnSettings}
          </div>
        )}
      </div>
      {hasExtraStickyContent && (
        <div className={classes.extraStickyContent}>{extraStickyContent}</div>
      )}
      {hasScrollToTopButton && (
        <Button
          size='sm'
          color='accent'
          variant='solid'
          onClick={scrollTop}
          leadingIcon={ArrowUpIcon}
          className={classes.unreadButton}
        >
          <FormattedMessage
            id='column_header.scroll_to_top'
            defaultMessage='Scroll to top'
          />
        </Button>
      )}
    </header>
  );
};

/**
 * This is used for pages that don't need a column title,
 * but should have the same styles as the column header
 */
export const EmptyColumnHeader: React.FC = () => (
  <div className={classes.root}>
    <div className={classes.layout} />
  </div>
);

type ColumnHeaderButtonProps = DistributedOmit<IconButtonProps, 'size'> & {
  showTextOnDesktop?: boolean;
};

export const ColumnHeaderButton: React.FC<ColumnHeaderButtonProps> = ({
  showTextOnDesktop,
  variant = 'ghost',
  icon,
  children,
  ...props
}) => {
  const isMobile = useBreakpoint('openable');

  if (showTextOnDesktop && !isMobile) {
    return (
      <Button {...props} variant={variant} size='sm'>
        {children}
      </Button>
    );
  }

  return (
    <IconButton icon={icon} {...props} variant={variant} size='sm'>
      {children}
    </IconButton>
  );
};

const BackButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const history = useAppHistory();

  const goBack = useCallback(() => {
    if (onClick) {
      onClick();
      return;
    }

    if (history.location.state?.fromMastodon) {
      history.goBack();
    } else {
      history.push('/');
    }
  }, [history, onClick]);

  return (
    <div className={classes.leftButton}>
      <ColumnHeaderButton onClick={goBack} icon={ArrowLeftIcon}>
        <FormattedMessage id='column_back_button.label' defaultMessage='Back' />
      </ColumnHeaderButton>
    </div>
  );
};

const MobileMenuButton: React.FC = () => {
  const dispatch = useAppDispatch();

  const openMobileNavigation = useCallback(() => {
    dispatch(openNavigation());
  }, [dispatch]);

  const isMobile = useBreakpoint('openable');
  const isBlue2 =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';

  // BlueLab 2.0 already provides the primary sidebar trigger in the
  // mobile utility bar, so rendering the generic column trigger duplicates it.
  if (!isMobile || isBlue2) {
    return null;
  }

  return (
    <div className={classes.leftButton}>
      <ColumnHeaderButton onClick={openMobileNavigation} icon={ListIcon}>
        <FormattedMessage id='tabs_bar.menu' defaultMessage='Menu' />
      </ColumnHeaderButton>
    </div>
  );
};

function updateHeaderHeightCssVariable(element: HTMLElement) {
  const newHeight = `${element.offsetHeight}px`;
  const currentHeight = getComputedStyle(
    document.documentElement,
  ).getPropertyValue('--column-header-height');

  if (newHeight !== currentHeight) {
    document.documentElement.style.setProperty(
      '--column-header-height',
      `${element.offsetHeight}px`,
    );
  }
}

/**
 * Writes changes in the column header's height to a CSS variable
 * that is used to keep feed items in view when navigating them via hotkeys
 */
function useTrackColumnHeaderHeight() {
  const onResize: ResizeObserverCallback = useCallback((entries) => {
    for (const { target } of entries) {
      if (target instanceof HTMLElement) {
        updateHeaderHeightCssVariable(target);
      }
    }
  }, []);

  const headerRef = useCallback(
    (node: HTMLElement | null) => {
      const isMultiColumnLayout = !!document.querySelector(
        'body.layout-multiple-columns',
      );
      if (!node || isMultiColumnLayout) {
        return;
      }

      const observer = new ResizeObserver(onResize);
      observer.observe(node);
      updateHeaderHeightCssVariable(node);

      return () => {
        observer.disconnect();
      };
    },
    [onResize],
  );

  return headerRef;
}
