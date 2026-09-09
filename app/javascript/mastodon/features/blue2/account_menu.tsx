import { useCallback, useEffect, useRef, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import { NavLink, useHistory } from 'react-router-dom';

import {
  CalendarDotsIcon,
  GavelIcon,
  GearIcon,
  HeartIcon,
  HouseIcon,
  ProhibitIcon,
  ShieldStarIcon,
  SignOutIcon,
  StackIcon,
  UserIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';

import { openModal } from '@/mastodon/actions/modal';
import { Avatar } from '@/mastodon/components/avatar';
import { VerifiedBadge } from '@/mastodon/components/display_name/verified_badge';
import { EmojiHTML } from '@/mastodon/components/emoji/html';
import { cleanExtraEmojis } from '@/mastodon/features/emoji/normalize';
import { useAccount } from '@/mastodon/hooks/useAccount';
import { useCustomEmojis } from '@/mastodon/hooks/useCustomEmojis';
import { useIdentity } from '@/mastodon/identity_context';
import {
  canManageReports,
  canViewAdminDashboard,
} from '@/mastodon/permissions';
import { useAppDispatch } from '@/mastodon/store';
import MoreHorizIcon from '@/material-icons/400-24px/more_horiz.svg?react';

import classes from './account_menu.module.scss';

export const Blue2AccountMenu: React.FC = () => {
  const intl = useIntl();
  const history = useHistory();
  const dispatch = useAppDispatch();
  const { accountId, permissions } = useIdentity();
  const account = useAccount(accountId);
  const localCustomEmojis = useCustomEmojis();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggleMenu = useCallback(() => {
    setOpen((value) => !value);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const goHome = useCallback(() => {
    setOpen(false);
    history.push('/home');
  }, [history]);

  const confirmLogout = useCallback(() => {
    setOpen(false);
    dispatch(openModal({ modalType: 'CONFIRM_LOG_OUT', modalProps: {} }));
  }, [dispatch]);

  if (!accountId || !account) return null;

  const isManager = canManageReports(permissions);
  const isAdmin = canViewAdminDashboard(permissions);
  const accountBasePath = `/@${account.acct}`;
  const displayName = account.display_name.trim()
    ? account.display_name
    : account.username;
  const displayNameEmojis = {
    ...localCustomEmojis,
    ...(cleanExtraEmojis(account.emojis) ?? {}),
  };
  const displayNameEmojiVersion = `${Object.keys(localCustomEmojis).length}-${account.emojis.size}`;
  const homeLabel = intl.formatMessage({
    id: 'tabs_bar.home',
    defaultMessage: 'Home',
  });
  const accountSettingsLabel = intl.formatMessage({
    id: 'tabs_bar.account_settings',
    defaultMessage: 'Account settings',
  });

  return (
    <div className={classes.root} ref={rootRef}>
      <button
        type='button'
        className={classes.accountButton}
        onClick={toggleMenu}
        aria-expanded={open}
        aria-haspopup='menu'
        aria-label={accountSettingsLabel}
      >
        <Avatar account={account} size={42} />
        <span className={classes.identity}>
          <span className={classes.displayName}>
            {account.display_name_html ? (
              <EmojiHTML
                key={`${account.id}-${displayNameEmojiVersion}`}
                className='display-name__html'
                htmlString={account.display_name_html}
                as='strong'
                extraEmojis={displayNameEmojis}
              />
            ) : (
              <strong>{displayName}</strong>
            )}
            <VerifiedBadge account={account} />
          </span>
          <span className={classes.handle}>@{account.acct}</span>
        </span>
        <MoreHorizIcon className={classes.moreIcon} />
      </button>

      <button
        type='button'
        className={classes.homeButton}
        onClick={goHome}
        aria-label={homeLabel}
        title={homeLabel}
      >
        <HouseIcon size={27} />
        <span>{homeLabel}</span>
      </button>

      {open && (
        <div className={classes.menu} role='menu'>
          <NavLink
            to='/profile/edit'
            className={classes.menuItem}
            onClick={closeMenu}
            role='menuitem'
          >
            <UserIcon />
            <FormattedMessage
              id='account.edit_profile'
              defaultMessage='Edit profile'
            />
          </NavLink>

          <a
            href='/settings/preferences'
            className={classes.menuItem}
            onClick={closeMenu}
            role='menuitem'
          >
            <GearIcon />
            <FormattedMessage
              id='navigation_bar.preferences'
              defaultMessage='Preferences'
            />
          </a>

          <div className={classes.menuDivider} role='separator' />

          <NavLink
            to={`${accountBasePath}/collections`}
            className={classes.menuItem}
            onClick={closeMenu}
            role='menuitem'
          >
            <StackIcon />
            <FormattedMessage
              id='navigation_bar.collections'
              defaultMessage='Collections'
            />
          </NavLink>

          <NavLink
            to='/scheduled'
            className={classes.menuItem}
            onClick={closeMenu}
            role='menuitem'
          >
            <CalendarDotsIcon />
            <FormattedMessage
              id='navigation_bar.scheduled_publications'
              defaultMessage='Scheduled publications'
            />
          </NavLink>

          <NavLink
            to='/favourites'
            className={classes.menuItem}
            onClick={closeMenu}
            role='menuitem'
          >
            <HeartIcon />
            <FormattedMessage
              id='navigation_bar.favourites'
              defaultMessage='Favorites'
            />
          </NavLink>

          <div className={classes.menuDivider} role='separator' />

          <a
            href='/relationships'
            className={classes.menuItem}
            onClick={closeMenu}
            role='menuitem'
          >
            <UsersThreeIcon />
            <FormattedMessage
              id='navigation_bar.follows_and_followers'
              defaultMessage='Follows and followers'
            />
          </a>

          <NavLink
            to='/blocks'
            className={classes.menuItem}
            onClick={closeMenu}
            role='menuitem'
          >
            <ProhibitIcon />
            <FormattedMessage
              id='navigation_bar.blocks'
              defaultMessage='Blocked users'
            />
          </NavLink>

          {(isManager || isAdmin) && (
            <>
              <div className={classes.menuDivider} role='separator' />

              {isAdmin && (
                <a
                  href='/admin/dashboard'
                  className={classes.menuItem}
                  onClick={closeMenu}
                  role='menuitem'
                >
                  <GavelIcon />
                  <FormattedMessage
                    id='navigation_bar.administration'
                    defaultMessage='Administration'
                  />
                </a>
              )}

              {isManager && (
                <a
                  href='/admin/reports'
                  className={classes.menuItem}
                  onClick={closeMenu}
                  role='menuitem'
                >
                  <ShieldStarIcon />
                  <FormattedMessage
                    id='navigation_bar.moderation'
                    defaultMessage='Moderation'
                  />
                </a>
              )}
            </>
          )}

          <div className={classes.menuDivider} role='separator' />

          <button
            type='button'
            className={classes.menuItem}
            onClick={confirmLogout}
            role='menuitem'
          >
            <SignOutIcon />
            <FormattedMessage
              id='navigation_bar.logout'
              defaultMessage='Logout'
            />
          </button>
        </div>
      )}
    </div>
  );
};
