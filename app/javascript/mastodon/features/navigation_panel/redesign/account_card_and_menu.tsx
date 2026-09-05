import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

import {
  DotsThreeIcon,
  UserIcon,
  GearIcon,
  StackIcon,
  HeartIcon,
  UsersThreeIcon,
  ProhibitIcon,
  GavelIcon,
  ShieldStarIcon,
  SignOutIcon,
} from '@phosphor-icons/react';

import { openModal } from '@/mastodon/actions/modal';
import { Avatar } from '@/mastodon/components/avatar';
import { IconButton } from '@/mastodon/components/button/redesign';
import { AccountLock } from '@/mastodon/components/display_name/lock';
import { EmojiHTML } from '@/mastodon/components/emoji/html';
import {
  Menu,
  MenuItem,
  MenuItemDivider,
  MenuItemLink,
  MenuList,
  MenuTrigger,
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

export const NavigationAccountCardAndMenu: React.FC = () => {
  const dispatch = useAppDispatch();
  const { accountId, permissions } = useIdentity();
  const account = useAccount(accountId);
  const localCustomEmojis = useCustomEmojis();

  const confirmLogout = useCallback(() => {
    dispatch(openModal({ modalType: 'CONFIRM_LOG_OUT', modalProps: {} }));
  }, [dispatch]);

  if (!accountId || !account) {
    return null;
  }

  const isManager = canManageReports(permissions);
  const isAdmin = canViewAdminDashboard(permissions);
  const accountBasePath = `/@${account.acct}`;
  const displayNameEmojis = {
    ...localCustomEmojis,
    ...(cleanExtraEmojis(account.emojis) ?? {}),
  };
  const displayNameEmojiVersion = `${Object.keys(localCustomEmojis).length}-${account.emojis.size}`;

  return (
    <div className={classes.root}>
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
              {account.locked && <AccountLock />}
            </bdi>{' '}
            <span className='display-name__account'>@{account.username}</span>
          </span>
        </span>
      </a>
      <Menu type='navigation'>
        <MenuTrigger
          as={IconButton}
          icon={DotsThreeIcon}
          variant='ghost'
          size='sm'
        >
          <FormattedMessage id='tabs_bar.more' defaultMessage='More' />
        </MenuTrigger>
        <MenuList placement='top' offset={8}>
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
          <MenuItemLink to='/favourites' icon={HeartIcon}>
            <FormattedMessage
              id='navigation_bar.favourites'
              defaultMessage='Favorites'
            />
          </MenuItemLink>

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
                <MenuItemLink
                  as='a'
                  href='/admin/reports'
                  icon={ShieldStarIcon}
                >
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
              id='navigation_bar.logout'
              defaultMessage='Logout'
            />
          </MenuItem>
        </MenuList>
      </Menu>
    </div>
  );
};
