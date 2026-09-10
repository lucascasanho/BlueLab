import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [slideOutOpen, setSlideOutOpen] = useState(false);
  const slideOutRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inSlideOut || !slideOutOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!slideOutRootRef.current?.contains(event.target as Node)) {
        setSlideOutOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSlideOutOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [inSlideOut, slideOutOpen]);

  if (!accountId || !account) {
    return null;
  }

  const displayNameEmojis = {
    ...localCustomEmojis,
    ...(cleanExtraEmojis(account.emojis) ?? {}),
  };
  const displayNameEmojiVersion = `${Object.keys(localCustomEmojis).length}-${account.emojis.size}`;

  const accountCard = (
    <>
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
    </>
  );

  if (inSlideOut) {
    return (
      <div className={classes.root} ref={slideOutRootRef}>
        {accountCard}
        <IconButton
          icon={DotsThreeIcon}
          variant='ghost'
          size='sm'
          aria-expanded={slideOutOpen}
          aria-haspopup='menu'
          aria-label='Account settings'
          onClick={() => setSlideOutOpen((value) => !value)}
        />
        {slideOutOpen && (
          <div className={classes.slideOutMenu} role='menu'>
            <AccountMenuItems />
          </div>
        )}
      </div>
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
