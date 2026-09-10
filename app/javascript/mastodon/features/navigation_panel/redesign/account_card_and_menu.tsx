import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

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

/**
 * The account card lives inside a scrollable, gesture-enabled drawer. The
 * generic MenuList intentionally becomes a bottom sheet at mobile widths,
 * which makes it unsuitable for this particular anchored menu. Keep the
 * shared Menu state, keyboard handling and AccountMenuItems, but render the
 * list next to its card so it stays inside the drawer's stacking context.
 */
const SlideOutAccountMenu: React.FC<{ accountCard: React.ReactNode }> = ({
  accountCard,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { popover, menuTriggerProps, menuListProps } = useMenuContext();

  useLayoutEffect(() => {
    if (!popover.isMenuOpen) {
      return undefined;
    }

    const constrainMenuToViewport = () => {
      const root = rootRef.current;
      if (!root) return;

      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      const menuGap =
        Number.parseFloat(
          getComputedStyle(root).getPropertyValue('--space-xs'),
        ) || 8;
      const availableAbove = Math.max(
        0,
        root.getBoundingClientRect().top - viewportTop - menuGap,
      );
      root.style.setProperty(
        '--slide-out-account-menu-max-height',
        `${Math.floor(availableAbove)}px`,
      );
    };

    constrainMenuToViewport();
    window.addEventListener('resize', constrainMenuToViewport);
    window.visualViewport?.addEventListener('resize', constrainMenuToViewport);
    window.visualViewport?.addEventListener('scroll', constrainMenuToViewport);

    return () => {
      window.removeEventListener('resize', constrainMenuToViewport);
      window.visualViewport?.removeEventListener(
        'resize',
        constrainMenuToViewport,
      );
      window.visualViewport?.removeEventListener(
        'scroll',
        constrainMenuToViewport,
      );
    };
  }, [popover.isMenuOpen]);

  useEffect(() => {
    if (!popover.isMenuOpen) {
      return undefined;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
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

  return (
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
      {popover.isMenuOpen && (
        <div
          {...menuListProps}
          className={classes.slideOutMenu}
          data-testid='slide-out-account-menu'
          onPointerDown={stopDrawerGesture}
          onTouchStart={stopDrawerGesture}
        >
          <AccountMenuItems context='mobile' />
        </div>
      )}
    </div>
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
