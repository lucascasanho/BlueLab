import { useCallback } from 'react';

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
import { Popover } from '@/mastodon/components/popover';
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

const stopDrawerGesture = (event: React.SyntheticEvent) => {
  event.stopPropagation();
};

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

  return (
    <div
      className={classes.root}
      data-in-slide-out={inSlideOut ? 'true' : undefined}
      onPointerDown={inSlideOut ? stopDrawerGesture : undefined}
      onTouchStart={inSlideOut ? stopDrawerGesture : undefined}
    >
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
        {inSlideOut ? (
          <SlideOutAccountMenuList />
        ) : (
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
        )}
      </Menu>
    </div>
  );
};

/**
 * The true mobile navigation lives inside a transformed, gesture-driven drawer.
 * Render its account list through the plain Popover portal instead of MenuCard:
 * this is the same escape-from-overflow strategy used by Blue2AccountMenu and
 * avoids both the drawer stacking context and native-popover lifecycle here.
 */
const SlideOutAccountMenuList: React.FC = () => {
  const { popover, menuListProps } = useMenuContext();

  if (!popover.isMenuOpen) {
    return null;
  }

  const { ref: menuListRef, ...menuListRest } = menuListProps;

  return (
    <Popover
      isOpen
      onClose={popover.closeMenu}
      reference={popover.reference}
      placement='top-end'
      strategy='fixed'
      offset={8}
    >
      {({ props: floatingProps }) => {
        const { ref: floatingRef, ...floatingRest } = floatingProps;

        return (
          <div
            {...floatingRest}
            {...menuListRest}
            ref={(element) => {
              floatingRef?.(element);
              menuListRef(element);
            }}
            className={classes.slideOutMenu}
            data-testid='slide-out-account-menu'
          >
            <ul>
              <AccountMenuItems />
            </ul>
          </div>
        );
      }}
    </Popover>
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

      <MenuItemLink to='/favourites' icon={HeartIcon}>
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
