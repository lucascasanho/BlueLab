import { useCallback, useEffect, useRef, useState } from 'react';

import { FormattedMessage } from 'react-intl';
import { NavLink } from 'react-router-dom';

import AddIcon from '@/material-icons/400-24px/add.svg?react';
import LogoutIcon from '@/material-icons/400-24px/logout.svg?react';
import MoreHorizIcon from '@/material-icons/400-24px/more_horiz.svg?react';
import { Avatar } from '@/mastodon/components/avatar';
import { useAccount } from '@/mastodon/hooks/useAccount';
import { useIdentity } from '@/mastodon/identity_context';

import { Blue2ProfileIcon } from './icons';
import classes from './account_menu.module.scss';

const csrfToken = () =>
  document
    .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
    ?.getAttribute('content') ?? '';

export const Blue2AccountMenu: React.FC = () => {
  const { accountId } = useIdentity();
  const account = useAccount(accountId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const profilePath = account?.acct ? `/@${account.acct}` : '/home';
  const displayName = account?.display_name || account?.username || account?.acct;

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

  const signOutAndGo = useCallback(async (target: string) => {
    try {
      const token = csrfToken();
      await fetch('/auth/sign_out', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: token ? { 'X-CSRF-Token': token } : undefined,
      });
    } finally {
      window.location.assign(target);
    }
  }, []);

  if (!account) return null;

  return (
    <div className={classes.root} ref={rootRef}>
      <button
        type='button'
        className={classes.accountButton}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup='menu'
      >
        <Avatar account={account} size={42} />
        <span className={classes.identity}>
          <strong>{displayName}</strong>
          <span>@{account.acct}</span>
        </span>
        <MoreHorizIcon className={classes.moreIcon} />
      </button>

      {open && (
        <div className={classes.menu} role='menu'>
          <div className={classes.menuTitle}>
            <FormattedMessage
              id='blue2.account_menu.switch_account'
              defaultMessage='Alterar conta'
            />
          </div>

          <NavLink
            to={profilePath}
            className={classes.currentAccount}
            onClick={() => setOpen(false)}
            role='menuitem'
          >
            <Avatar account={account} size={34} />
            <span>
              <strong>{displayName}</strong>
              <small>@{account.acct}</small>
            </span>
            <span className={classes.activeDot} aria-hidden='true' />
          </NavLink>

          <div className={classes.divider} />

          <NavLink
            to={profilePath}
            className={classes.menuItem}
            onClick={() => setOpen(false)}
            role='menuitem'
          >
            <Blue2ProfileIcon size={22} />
            <FormattedMessage
              id='blue2.account_menu.go_to_profile'
              defaultMessage='Ir para este perfil'
            />
          </NavLink>

          <button
            type='button'
            className={classes.menuItem}
            onClick={() => void signOutAndGo('/auth/sign_in')}
            role='menuitem'
          >
            <AddIcon />
            <FormattedMessage
              id='blue2.account_menu.add_account'
              defaultMessage='Adicionar outra conta'
            />
          </button>

          <button
            type='button'
            className={classes.menuItem}
            onClick={() => void signOutAndGo('/')}
            role='menuitem'
          >
            <LogoutIcon />
            <FormattedMessage id='navigation_bar.logout' defaultMessage='Sair' />
          </button>
        </div>
      )}
    </div>
  );
};
