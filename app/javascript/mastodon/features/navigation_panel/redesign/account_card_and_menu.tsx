import { useCallback, useEffect, useRef, useState } from 'react';

import { FormattedMessage } from 'react-intl';

import {
  DotsThreeIcon,
  UserIcon,
  GearIcon,
  StackIcon,
  HeartIcon,
  StarIcon,
  CalendarDotsIcon,
  BookmarkSimpleIcon,
  UsersThreeIcon,
  ProhibitIcon,
  GavelIcon,
  ShieldStarIcon,
  SignOutIcon,
} from '@phosphor-icons/react';

import { openModal } from '@/mastodon/actions/modal';
import { Avatar } from '@/mastodon/components/avatar';
import { IconButton } from '@/mastodon/components/button/redesign';
import { DisplayName } from '@/mastodon/components/display_name';
import { useAccountHandle } from '@/mastodon/components/display_name/default';
import { LockupContent, LockupWrapper } from '@/mastodon/components/lockup';
import {
  Menu,
  MenuItem,
  MenuItemDivider,
  MenuItemLink,
  MenuList,
  MenuTrigger,
} from '@/mastodon/components/menu';
import { Popover } from '@/mastodon/components/popover';
import { useAccount } from '@/mastodon/hooks/useAccount';
import { useIdentity } from '@/mastodon/identity_context';
import {
  canManageReports,
  canViewAdminDashboard,
} from '@/mastodon/permissions';
import { useAppDispatch } from '@/mastodon/store';

import classes from './account_card_and_menu.module.scss';

const stopDrawerGesture = (event: React.SyntheticEvent) => {
  event.stopPropagation();
};

export const NavigationAccountCardAndMenu: React.FC<{
  inSlideOut?: boolean;
}> = ({ inSlideOut = false }) => {
  const { accountId } = useIdentity();

  if (!accountId) {
    return null;
  }

  if (inSlideOut) {
    return (
      <div
        data-in-slide-out='true'
        onPointerDown={stopDrawerGesture}
        onTouchStart={stopDrawerGesture}
      >
        <AccountSummary />
        <SlideOutAccountMenu />
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <AccountSummary />
      <Menu type='navigation'>
        <MenuTrigger
          as={IconButton}
          icon={DotsThreeIcon}
          variant='ghost'
          size='sm'
        >
          <FormattedMessage
            id='tabs_bar.account_settings'
            defaultMessage='Account settings'
          />
        </MenuTrigger>
        <MenuList
          portal
          mobilePresentation='popover'
          placement='top-end'
          strategy='fixed'
          offset={8}
          maxWidth='min(280px, calc(100vw - 2 * var(--space-sm)))'
          data-testid='account-menu'
        >
          <AccountMenuItems />
        </MenuList>
      </Menu>
    </div>
  );
};

const AccountSummary: React.FC = () => {
  const { accountId } = useIdentity();
  const account = useAccount(accountId);
  const handle = useAccountHandle(account);

  return (
    <LockupWrapper icon={<Avatar account={account} size={32} />}>
      <LockupContent subtitle={handle}>
        <DisplayName variant='simple' account={account} />
      </LockupContent>
    </LockupWrapper>
  );
};

/**
 * The mobile navigation lives inside a transformed, gesture-driven drawer.
 * Open on pointerdown so a later gesture cancellation cannot swallow the
 * activation; ignore the synthetic click that often follows a touch event.
 */
const SlideOutAccountMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const pointerHandledRef = useRef(false);
  const pointerResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const toggleMenu = useCallback(() => {
    setOpen((value) => !value);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    anchor?.focus({ preventScroll: true });
  }, [anchor]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [closeMenu, open]);

  const markPointerHandled = useCallback(() => {
    pointerHandledRef.current = true;

    if (pointerResetTimerRef.current) {
      clearTimeout(pointerResetTimerRef.current);
    }

    pointerResetTimerRef.current = setTimeout(() => {
      pointerHandledRef.current = false;
      pointerResetTimerRef.current = null;
    }, 750);
  }, []);

  const handlePointerDown = useCallback<
    React.PointerEventHandler<HTMLButtonElement>
  >(
    (event) => {
      event.stopPropagation();

      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      setAnchor(event.currentTarget);
      markPointerHandled();
      toggleMenu();
    },
    [markPointerHandled, toggleMenu],
  );

  const handleClick = useCallback<React.MouseEventHandler<HTMLButtonElement>>(
    (event) => {
      event.stopPropagation();

      if (pointerHandledRef.current) {
        pointerHandledRef.current = false;
        if (pointerResetTimerRef.current) {
          clearTimeout(pointerResetTimerRef.current);
          pointerResetTimerRef.current = null;
        }
        return;
      }

      setAnchor(event.currentTarget);
      toggleMenu();
    },
    [toggleMenu],
  );

  return (
    <>
      <IconButton
        ref={setAnchor}
        icon={DotsThreeIcon}
        variant='ghost'
        size='sm'
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        aria-expanded={open}
        aria-haspopup='menu'
      >
        <FormattedMessage
          id='tabs_bar.account_settings'
          defaultMessage='Account settings'
        />
      </IconButton>

      {open && anchor && (
        <Popover
          isOpen={open}
          onClose={closeMenu}
          reference={anchor}
          placement='top-end'
          strategy='fixed'
          offset={8}
        >
          {({ props: floatingProps }) => (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
            <div
              {...floatingProps}
              className={classes.slideOutMenu}
              data-testid='slide-out-account-menu'
              onPointerDown={stopDrawerGesture}
              onTouchStart={stopDrawerGesture}
              onClick={stopDrawerGesture}
            >
              <Menu type='navigation' onClose={closeMenu}>
                <ul>
                  <AccountMenuItems />
                </ul>
              </Menu>
            </div>
          )}
        </Popover>
      )}
    </>
  );
};

export const AccountMenuItems: React.FC<{
  context?: 'default' | 'mobile';
}> = ({ context = 'default' }) => {
  const dispatch = useAppDispatch();
  const { accountId, permissions } = useIdentity();
  const account = useAccount(accountId);

  const confirmLogout = useCallback(() => {
    dispatch(openModal({ modalType: 'CONFIRM_LOG_OUT', modalProps: {} }));
  }, [dispatch]);

  if (!accountId) {
    return null;
  }

  const isManager = canManageReports(permissions);
  const isAdmin = canViewAdminDashboard(permissions);

  const accountBasePath = `/@${account?.acct}`;
  const FavouriteIcon =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2'
      ? StarIcon
      : HeartIcon;

  return (
    <>
      {context === 'mobile' && <ProfileMenuItem />}

      <MenuItemLink to='/profile/edit' icon={UserIcon}>
        <FormattedMessage
          id='account.edit_profile'
          defaultMessage='Edit profile'
        />
      </MenuItemLink>

      <MenuItemLink as='a' href='/settings/preferences' icon={GearIcon}>
        <FormattedMessage
          id='navigation_bar.preferences'
          defaultMessage='Preferences'
        />
      </MenuItemLink>

      <MenuItemDivider />

      <MenuItemLink to={`${accountBasePath}/collections`} icon={StackIcon}>
        <FormattedMessage
          id='navigation_bar.collections'
          defaultMessage='Collections'
        />
      </MenuItemLink>

      <MenuItemLink to='/scheduled' icon={CalendarDotsIcon}>
        <FormattedMessage
          id='navigation_bar.scheduled_publications'
          defaultMessage='Scheduled publications'
        />
      </MenuItemLink>

      <MenuItemLink to='/favourites' icon={FavouriteIcon}>
        <FormattedMessage
          id='navigation_bar.favourites'
          defaultMessage='Favorites'
        />
      </MenuItemLink>

      {context === 'mobile' && (
        <MenuItemLink to='/bookmarks' icon={BookmarkSimpleIcon}>
          <FormattedMessage
            id='navigation_bar.bookmarks'
            defaultMessage='Bookmarks'
          />
        </MenuItemLink>
      )}

      <MenuItemDivider />

      <MenuItemLink as='a' href='/relationships' icon={UsersThreeIcon}>
        <FormattedMessage
          id='navigation_bar.follows_and_followers'
          defaultMessage='Follows and followers'
        />
      </MenuItemLink>

      <MenuItemLink to='/blocks' icon={ProhibitIcon}>
        <FormattedMessage
          id='navigation_bar.blocks'
          defaultMessage='Blocked users'
        />
      </MenuItemLink>

      {(isManager || isAdmin) && (
        <>
          <MenuItemDivider />

          {isAdmin && (
            <MenuItemLink as='a' href='/admin/dashboard' icon={GavelIcon}>
              <FormattedMessage
                id='navigation_bar.administration'
                defaultMessage='Administration'
              />
            </MenuItemLink>
          )}

          {isManager && (
            <MenuItemLink as='a' href='/admin/reports' icon={ShieldStarIcon}>
              <FormattedMessage
                id='navigation_bar.moderation'
                defaultMessage='Moderation'
              />
            </MenuItemLink>
          )}
        </>
      )}

      <MenuItemDivider />

      <MenuItem onClick={confirmLogout} icon={SignOutIcon}>
        <FormattedMessage id='navigation_bar.logout' defaultMessage='Logout' />
      </MenuItem>
    </>
  );
};

const ProfileMenuItem: React.FC = () => {
  const { accountId } = useIdentity();
  const account = useAccount(accountId);
  const handle = useAccountHandle(account);

  if (!accountId) {
    return null;
  }

  const accountBasePath = `/@${account?.acct}`;

  return (
    <MenuItemLink to={accountBasePath} exact>
      <LockupWrapper
        icon={<Avatar account={account} size={40} />}
        className={classes.profileMenuItem}
      >
        <LockupContent subtitle={handle}>
          <DisplayName variant='simple' account={account} />
        </LockupContent>
      </LockupWrapper>
    </MenuItemLink>
  );
};
