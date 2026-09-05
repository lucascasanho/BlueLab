import { useCallback, useEffect, useRef, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import { NavLink, useHistory } from 'react-router-dom';

import { HouseIcon } from '@phosphor-icons/react';

import { Avatar } from '@/mastodon/components/avatar';
import { EmojiHTML } from '@/mastodon/components/emoji/html';
import { cleanExtraEmojis } from '@/mastodon/features/emoji/normalize';
import { useAccount } from '@/mastodon/hooks/useAccount';
import { useCustomEmojis } from '@/mastodon/hooks/useCustomEmojis';
import { useIdentity } from '@/mastodon/identity_context';
import LogoutIcon from '@/material-icons/400-24px/logout.svg?react';
import MoreHorizIcon from '@/material-icons/400-24px/more_horiz.svg?react';

import classes from './account_menu.module.scss';
import { Blue2ProfileIcon } from './icons';

const csrfToken = () =>
  document
    .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
    ?.getAttribute('content') ?? '';

export const Blue2AccountMenu: React.FC = () => {
  const intl = useIntl();
  const history = useHistory();
  const { accountId } = useIdentity();
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

  const signOut = useCallback(async () => {
    try {
      const token = csrfToken();
      await fetch('/auth/sign_out', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: token ? { 'X-CSRF-Token': token } : undefined,
      });
    } finally {
      window.location.assign('/');
    }
  }, []);

  const handleSignOut = useCallback(() => {
    void signOut();
  }, [signOut]);

  if (!account) return null;

  const profilePath = account.acct ? `/@${account.acct}` : '/home';
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

  return (
    <div className={classes.root} ref={rootRef}>
      <button
        type='button'
        className={classes.accountButton}
        onClick={toggleMenu}
        aria-expanded={open}
        aria-haspopup='menu'
      >
        <Avatar account={account} size={42} />
        <span className={classes.identity}>
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
          <span>@{account.acct}</span>
        </span>
        <MoreHorizIcon className={classes.moreIcon} />
      </button>

      <button
        type='button'
        className={classes.compactHomeButton}
        onClick={goHome}
        aria-label={homeLabel}
        title={homeLabel}
      >
        <HouseIcon size={27} />
      </button>

      {open && (
        <div className={classes.menu} role='menu'>
          <NavLink
            to={profilePath}
            className={classes.menuItem}
            onClick={closeMenu}
            role='menuitem'
          >
            <Blue2ProfileIcon size={22} />
            <FormattedMessage
              id='account.go_to_profile'
              defaultMessage='Go to profile'
            />
          </NavLink>

          <button
            type='button'
            className={classes.menuItem}
            onClick={handleSignOut}
            role='menuitem'
          >
            <LogoutIcon />
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
