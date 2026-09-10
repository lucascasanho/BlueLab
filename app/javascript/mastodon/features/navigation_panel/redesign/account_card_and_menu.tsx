import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { FormattedMessage } from 'react-intl';

import {
  DotsThreeIcon,
  UserIcon,
  GearIcon,
  StackIcon,
  HeartIcon,
  BookmarkSimpleIcon,
  UsersThreeIcon,
  ProhibitIcon,
  GavelIcon,
  ShieldStarIcon,
  SignOutIcon,
  CalendarDotsIcon,
} from '@phosphor-icons/react';

import { openModal } from '@/mastodon/actions/modal';
import { Avatar } from '@/mastodon/components/avatar';
import { IconButton } from '@/mastodon/components/button/redesign';
import { DisplayName } from '@/mastodon/components/display_name';
import { useAccountHandle } from '@/mastodon/components/display_name/default';
import { AccountLock } from '@/mastodon/components/display_name/lock';
import { VerifiedBadge } from '@/mastodon/components/display_name/verified_badge';
import { EmojiHTML } from '@/mastodon/components/emoji/html';
import {
  ListItemContent,
  ListItemWrapper,
} from '@/mastodon/components/list_item';
import {
  Menu,
  MenuItem,
  MenuItemDivider,
  MenuItemLink,
  MenuList,
  MenuTrigger,
  useMenuContext,
} from '@/mastodon/components/menu';
import { cleanExtraEmojis } from '@/mastodon/features/emoji/normalize';
import { useAccount } from '@/mastodon/hooks/useAccount';
import { useCustomEmojis } from '@/mastodon/hooks/useCustomEmojis';
import { useIdentity } from '@/mastodon/identity_context';
import {
  canManageReports,
  canViewAdminDashboard,
} from '@/mastodon/permissions';
import { useAppDispatch } from '@/mastodon/store';

import classes from './account_card_and_menu.module.scss';

export const NavigationAccountCardAndMenu: React.FC<{
  inSlideOut?: boolean;
}> = ({ inSlideOut = false }) => {
  const { accountId } = useIdentity();
  const account = useAccount(accountId);
  const localCustomEmojis = useCustomEmojis();

  if (!accountId || !account) {
    return null;
  }

  const displayNameEmojis = {
    ...localCustomEmojis,
    ...(cleanExtraEmojis(account.emojis) ?? {}),
  };
  const displayNameEmojiVersion = `${Object.keys(localCustomEmojis).length}-${account.emojis.size}`;

  const accountCard = (
    <a
      className={classes.accountLink}
      href={account.url}
      data-hover-card-account={accountId}
    >
      <Avatar account={account} size={32} />
      <span className={classes.accountText}>
        <span className='display-name'>
          <bdi className='display-name__name'>
            <EmojiHTML
              key={`${account.id}-${displayNameEmojiVersion}`}
              className='display-name__html'
              htmlString={account.display_name_html}
              as='strong'
              extraEmojis={displayNameEmojis}
            />
            <VerifiedBadge account={account} />
            {account.locked && <AccountLock />}
          </bdi>{' '}
          <span className='display-name__account'>@{account.username}</span>
        </span>
      </span>
    </a>
  );

  if (inSlideOut) {
    return (
      <Menu>
        <SlideOutAccountMenu accountCard={accountCard} />
      </Menu>
    );
  }

  return (
    <div className={classes.root}>
      {accountCard}
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
        <MenuList placement='top' offset={8}>
          <AccountMenuItems />
        </MenuList>
      </Menu>
    </div>
  );
};

interface SlideOutMenuPosition {
  left: number;
  bottom: number;
  width: number;
  maxHeight: number;
}

/**
 * The account card lives inside the drawer's scroll container. An absolutely
 * positioned submenu is still clipped by that ancestor even when the card and
 * footer themselves use overflow: visible. Render the opened list in a portal
 * and position it from the card's viewport rect so the drawer can keep its own
 * scrolling while the submenu remains visibly anchored above the card.
 */
const SlideOutAccountMenu: React.FC<{ accountCard: React.ReactNode }> = ({
  accountCard,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<SlideOutMenuPosition | null>(
    null,
  );
  const { popover, menuTriggerProps, menuListProps } = useMenuContext();
  const { ref: menuListRef, ...menuListElementProps } = menuListProps;

  const updateMenuPosition = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const rect = root.getBoundingClientRect();
    const visualViewport = window.visualViewport;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportBottom = viewportTop + viewportHeight;
    const gap = 8;
    const left = Math.max(gap, rect.left);
    const width = Math.max(
      0,
      Math.min(rect.width, window.innerWidth - left - gap),
    );
    const anchorTop = Math.min(rect.top, viewportBottom - gap);
    const maxHeight = Math.max(gap, anchorTop - viewportTop - gap * 2);
    const bottom = Math.max(gap, window.innerHeight - anchorTop + gap);

    setMenuPosition({ left, bottom, width, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (!popover.isMenuOpen) {
      setMenuPosition(null);
      return undefined;
    }

    updateMenuPosition();

    const visualViewport = window.visualViewport;
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    visualViewport?.addEventListener('resize', updateMenuPosition);
    visualViewport?.addEventListener('scroll', updateMenuPosition);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
      visualViewport?.removeEventListener('resize', updateMenuPosition);
      visualViewport?.removeEventListener('scroll', updateMenuPosition);
    };
  }, [popover.isMenuOpen, updateMenuPosition]);

  useEffect(() => {
    if (!popover.isMenuOpen) {
      return undefined;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;

      const isInsideCard = rootRef.current?.contains(event.target) ?? false;
      const isInsideMenu = menuRef.current?.contains(event.target) ?? false;

      if (!isInsideCard && !isInsideMenu) {
        popover.closeMenu();
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        popover.closeMenu();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [popover]);

  const stopDrawerGesture = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);
  const toggleMenuWithoutDrawerClick = useCallback<
    React.MouseEventHandler<HTMLButtonElement>
  >(
    (event) => {
      event.stopPropagation();
      menuTriggerProps.onClick(event);
    },
    [menuTriggerProps],
  );
  const setMenuElement = useCallback(
    (element: HTMLDivElement | null) => {
      menuRef.current = element;
      menuListRef(element);
    },
    [menuListRef],
  );

  const menu =
    popover.isMenuOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            {...menuListElementProps}
            ref={setMenuElement}
            className={classes.slideOutMenu}
            data-testid='slide-out-account-menu'
            data-positioned={menuPosition ? 'true' : 'false'}
            style={
              menuPosition
                ? {
                    left: menuPosition.left,
                    bottom: menuPosition.bottom,
                    width: menuPosition.width,
                    maxHeight: menuPosition.maxHeight,
                  }
                : undefined
            }
            onPointerDown={stopDrawerGesture}
            onTouchStart={stopDrawerGesture}
          >
            <AccountMenuItems context='mobile' />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={rootRef}
        className={classes.root}
        data-in-slide-out='true'
        onPointerDown={stopDrawerGesture}
        onTouchStart={stopDrawerGesture}
      >
        {accountCard}
        <IconButton
          {...menuTriggerProps}
          icon={DotsThreeIcon}
          variant='ghost'
          size='sm'
          onClick={toggleMenuWithoutDrawerClick}
        >
          <FormattedMessage
            id='tabs_bar.account_settings'
            defaultMessage='Account settings'
          />
        </IconButton>
      </div>
      {menu}
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

  if (!accountId || !account) {
    return null;
  }

  const isManager = canManageReports(permissions);
  const isAdmin = canViewAdminDashboard(permissions);
  const accountBasePath = `/@${account.acct}`;

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
        <FormattedMessage id='tabs_bar.settings' defaultMessage='Settings' />
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

      <MenuItemLink to='/favourites' icon={HeartIcon}>
        <FormattedMessage
          id='navigation_bar.liked_posts'
          defaultMessage='Liked Posts'
        />
      </MenuItemLink>

      {context === 'mobile' && (
        <MenuItemLink to='/bookmarks' icon={BookmarkSimpleIcon}>
          <FormattedMessage
            id='navigation_bar.saved_posts'
            defaultMessage='Saved Posts'
          />
        </MenuItemLink>
      )}

      <MenuItemDivider />

      <MenuItemLink as='a' href='/relationships' icon={UsersThreeIcon}>
        <FormattedMessage
          id='navigation_bar.followers_and_following'
          defaultMessage='Followers & Following'
        />
      </MenuItemLink>

      <MenuItemLink to='/blocks' icon={ProhibitIcon}>
        <FormattedMessage
          id='navigation_bar.blocked_accounts'
          defaultMessage='Blocked accounts'
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
        <FormattedMessage
          id='navigation_bar.sign_out'
          defaultMessage='Sign out'
        />
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
    <MenuItemLink to={accountBasePath}>
      <ListItemWrapper
        icon={<Avatar account={account} size={40} />}
        className={classes.profileMenuItem}
      >
        <ListItemContent subtitle={handle}>
          <DisplayName variant='simple' account={account} />
        </ListItemContent>
      </ListItemWrapper>
    </MenuItemLink>
  );
};
