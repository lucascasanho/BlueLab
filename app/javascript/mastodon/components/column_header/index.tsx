import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

import classNames from 'classnames';
import { useLocation } from 'react-router';

import { ArrowLeftIcon, DotsThreeIcon, ListIcon } from '@phosphor-icons/react';
import type { DistributedOmit } from 'type-fest';

import { Menu, MenuItem, MenuItemDivider, MenuList, MenuTrigger } from '@/mastodon/components/menu';
import { openNavigation } from '@/mastodon/actions/navigation';
import { getColumnSkipLinkId } from '@/mastodon/features/ui/components/skip_links';
import { useBreakpoint } from '@/mastodon/features/ui/hooks/useBreakpoint';
import { useAppDispatch } from '@/mastodon/store';
import { useBlue2ColumnPinning } from '@/mastodon/features/ui/util/blue2_column_pinning';
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
  withUnreadMarker?: boolean;
  extraButtons?: React.ReactNode;
  extraStickyContent?: React.ReactNode;
  className?: string;
}

export const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  title,
  withBackButton,
  withUnreadMarker,
  extraButtons,
  extraStickyContent,
  className,
  ...props
}: ColumnHeaderProps) => {
  const { scrollTop } = useColumn();
  const columnIndex = useColumnIndexContext();
  const location = useLocation<LocationState>();
  const hasBackButton =
    withBackButton === true ||
    (withBackButton === 'auto' && location.state?.fromMastodon);
  const hasExtraStickyContent = hasReactChildren(extraStickyContent);
  const blue2ColumnPinning = useBlue2ColumnPinning();
  const showBlue2ColumnSettings =
    blue2ColumnPinning.canPin && !hasReactChildren(extraButtons);

  const history = useAppHistory();

  const blue2ColumnSettings = showBlue2ColumnSettings ? (
    <Menu>
      <MenuTrigger as={ColumnHeaderButton} icon={DotsThreeIcon}>
        {blue2ColumnPinning.pinned ? (
          <FormattedMessage
            id='column_header.unpin'
            defaultMessage='Unpin'
          />
        ) : (
          <FormattedMessage
            id='column_header.pin'
            defaultMessage='Pin'
          />
        )}
      </MenuTrigger>
      <MenuList placement='bottom-end' strategy='fixed'>
        <MenuItem
          onClick={() => {
            if (!blue2ColumnPinning.pinned) {
              history.replace('/');
            }
            blue2ColumnPinning.onPin();
          }}
        >
          {blue2ColumnPinning.pinned ? (
            <FormattedMessage id='column_header.unpin' defaultMessage='Unpin' />
          ) : (
            <FormattedMessage id='column_header.pin' defaultMessage='Pin' />
          )}
        </MenuItem>
        {blue2ColumnPinning.pinned && <MenuItemDivider />}
        {blue2ColumnPinning.pinned && (
          <>
            <MenuItem onClick={() => blue2ColumnPinning.onMove(-1)}>
              <FormattedMessage
                id='column_header.moveLeft_settings'
                defaultMessage='Move column to the left'
              />
            </MenuItem>
            <MenuItem onClick={() => blue2ColumnPinning.onMove(1)}>
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

  return (
    <header
      {...props}
      className={classNames(
        className,
        classes.root,
        hasExtraStickyContent && classes.withStickyContent,
      )}
    >
      <div className={classes.layout} data-has-unread={withUnreadMarker}>
        {hasBackButton ? <BackButton /> : <MobileMenuButton />}
        <NavigationFocusTarget className={classes.title}>
          <button
            type='button'
            onClick={scrollTop}
            id={getColumnSkipLinkId(columnIndex)}
          >
            {title}
            {withUnreadMarker && (
              <span className='sr-only'>
                {' '}
                <FormattedMessage
                  id='column.has_unread_content'
                  defaultMessage='(has unread content)'
                />
              </span>
            )}
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
    </header>
  );
};

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

const BackButton: React.FC = () => {
  const history = useAppHistory();

  const goBack = useCallback(() => {
    if (history.location.state?.fromMastodon) {
      history.goBack();
    } else {
      history.push('/');
    }
  }, [history]);

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
