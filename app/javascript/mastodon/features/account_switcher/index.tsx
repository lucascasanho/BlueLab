import { useCallback, useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import api from '@/mastodon/api';
import { MenuItemGroup } from '@/mastodon/components/menu';
import { useAccount } from '@/mastodon/hooks/useAccount';
import { useIdentity } from '@/mastodon/identity_context';
import { getAccessToken, registrationsOpen } from '@/mastodon/initial_state';

import classes from './styles.module.scss';

export interface StoredAccount {
  id: string;
  acct: string;
  username: string;
  displayName: string;
  avatar: string;
  url: string;
  token: string;
  lastUsedAt: number;
}

const STORAGE_KEY = 'mastodon_bluelab_account_switcher';
const MAX_STORED_ACCOUNTS = 10;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStoredAccount = (value: unknown): value is StoredAccount =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.acct === 'string' &&
  typeof value.username === 'string' &&
  typeof value.displayName === 'string' &&
  typeof value.avatar === 'string' &&
  typeof value.url === 'string' &&
  typeof value.token === 'string' &&
  typeof value.lastUsedAt === 'number';

export const readStoredAccounts = (): StoredAccount[] => {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );

    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(isStoredAccount).slice(0, MAX_STORED_ACCOUNTS);
  } catch {
    return [];
  }
};

const writeStoredAccounts = (accounts: StoredAccount[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Storage may be unavailable or full. Normal authentication must still work.
  }
};

export const upsertStoredAccount = (
  account: StoredAccount,
  now = Date.now(),
): StoredAccount[] => {
  const next = [
    { ...account, lastUsedAt: now },
    ...readStoredAccounts().filter((entry) => entry.id !== account.id),
  ]
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, MAX_STORED_ACCOUNTS);

  writeStoredAccounts(next);
  return next;
};

export const removeStoredAccount = (accountId: string): StoredAccount[] => {
  const next = readStoredAccounts().filter(
    (account) => account.id !== accountId,
  );
  writeStoredAccounts(next);
  return next;
};

const switchToStoredAccount = async (account: StoredAccount) => {
  await api(false).post('/auth/account_switcher/switch', {
    token: account.token,
  });

  window.location.assign(window.location.href);
};

interface AccountSwitcherState {
  signedIn: boolean;
  accountId: string | null;
  storedAccounts: StoredAccount[];
  switchingId: string | null;
  error: boolean;
  switchAccount: (account: StoredAccount) => Promise<void>;
  removeAccount: (event: React.MouseEvent, accountId: string) => void;
}

const useCurrentAccountSession = () => {
  const { signedIn, accountId } = useIdentity();
  const account = useAccount(accountId);
  const accessToken = getAccessToken();

  useEffect(() => {
    if (!signedIn || !account || !accountId || !accessToken) {
      return;
    }

    upsertStoredAccount({
      id: accountId,
      acct: account.acct,
      username: account.username,
      displayName: account.display_name.trim() || account.username,
      avatar: account.avatar,
      url: account.url ?? '',
      token: accessToken,
      lastUsedAt: Date.now(),
    });
  }, [accessToken, account, accountId, signedIn]);

  return { signedIn, accountId };
};

export const AccountSwitcherSync: React.FC = () => {
  useCurrentAccountSession();
  return null;
};

export const useAccountSwitcher = (): AccountSwitcherState => {
  const { signedIn, accountId } = useCurrentAccountSession();

  const [storedAccounts, setStoredAccounts] =
    useState<StoredAccount[]>(readStoredAccounts);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const switchAccount = useCallback(
    async (target: StoredAccount) => {
      if (target.id === accountId) {
        return;
      }

      setSwitchingId(target.id);
      setError(false);

      try {
        await switchToStoredAccount(target);
      } catch (switchError) {
        const status =
          (switchError as { response?: { status?: number } }).response
            ?.status;

        if (status === 404 || status === 403) {
          setStoredAccounts(removeStoredAccount(target.id));
        }

        setError(true);
        setSwitchingId(null);
      }
    },
    [accountId],
  );

  const removeAccount = useCallback(
    (event: React.MouseEvent, targetId: string) => {
      event.stopPropagation();

      if (targetId === accountId) {
        return;
      }

      setStoredAccounts(removeStoredAccount(targetId));
    },
    [accountId],
  );

  return {
    signedIn: !!signedIn,
    accountId: accountId ?? null,
    storedAccounts,
    switchingId,
    error,
    switchAccount,
    removeAccount,
  };
};

const AccountList: React.FC<{
  variant: 'blue2' | 'navigation';
  state: AccountSwitcherState;
}> = ({ variant, state }) => {
  const { accountId, storedAccounts, switchingId, switchAccount, removeAccount } =
    state;
  const intl = useIntl();

  return (
    <>
      {storedAccounts.map((storedAccount) => {
        const active = storedAccount.id === accountId;
        const label = storedAccount.displayName || storedAccount.username;

        return (
          <li
            key={storedAccount.id}
            className={
              variant === 'blue2'
                ? classes.accountRow
                : classes.navigationAccountRow
            }
          >
            <button
              type='button'
              className={
                variant === 'blue2'
                  ? classes.accountButton
                  : classes.navigationAccountButton
              }
              data-menu-item={variant === 'navigation' ? true : undefined}
              aria-current={active ? 'page' : undefined}
              disabled={active || switchingId !== null}
              onClick={() => {
                void switchAccount(storedAccount);
              }}
            >
              <img
                src={storedAccount.avatar}
                alt=''
                className={classes.avatar}
              />
              <span className={classes.accountText}>
                <strong>{label}</strong>
                <span>@{storedAccount.acct}</span>
              </span>
              {active && (
                <span className={classes.current}>
                  <FormattedMessage
                    id='account_switcher.current'
                    defaultMessage='Current'
                  />
                </span>
              )}
            </button>

            {!active && (
              <button
                type='button'
                className={classes.removeButton}
                disabled={switchingId !== null}
                aria-label={intl.formatMessage(
                  {
                    id: 'account_switcher.remove',
                    defaultMessage:
                      'Remove {account} from this device',
                  },
                  { account: label },
                )}
                onClick={(event) => removeAccount(event, storedAccount.id)}
              >
                ×
              </button>
            )}
          </li>
        );
      })}
    </>
  );
};

const AccountSwitcherActions: React.FC<{
  variant: 'blue2' | 'navigation';
}> = ({ variant }) => {
  const linkClass =
    variant === 'blue2' ? classes.action : classes.navigationAction;

  const signInLink = (
    <a
      href='/auth/sign_in?account_switcher=1'
      className={linkClass}
      data-menu-item={variant === 'navigation' ? true : undefined}
    >
      <FormattedMessage
        id='account_switcher.sign_in'
        defaultMessage='Sign in to another account'
      />
    </a>
  );

  const createLink = registrationsOpen ? (
    <a
      href='/auth/sign_up?account_switcher=1'
      className={linkClass}
      data-menu-item={variant === 'navigation' ? true : undefined}
    >
      <FormattedMessage
        id='account_switcher.create'
        defaultMessage='Create another account'
      />
    </a>
  ) : null;

  if (variant === 'navigation') {
    return (
      <>
        <li>{signInLink}</li>
        {createLink && <li>{createLink}</li>}
      </>
    );
  }

  return (
    <div>
      {signInLink}
      {createLink}
    </div>
  );
};

export const AccountSwitcherMenuSection: React.FC<{
  variant: 'blue2' | 'navigation';
}> = ({ variant }) => {
  const state = useAccountSwitcher();
  const { signedIn, storedAccounts, error } = state;

  if (!signedIn) {
    return null;
  }

  const sectionLabel = (
    <FormattedMessage id='account_switcher.title' defaultMessage='Accounts' />
  );

  if (variant === 'navigation') {
    return (
      <MenuItemGroup
        label={sectionLabel}
        className={classes.navigationSection}
      >
        <AccountList variant='navigation' state={state} />
        {error && (
          <li className={classes.navigationError} role='alert'>
            <FormattedMessage
              id='account_switcher.error'
              defaultMessage='This account session is no longer available. Sign in again to add it.'
            />
          </li>
        )}
        <AccountSwitcherActions variant='navigation' />
      </MenuItemGroup>
    );
  }

  return (
    <div className={classes.section}>
      <div className={classes.header}>
        <span>{sectionLabel}</span>
        <span className={classes.count}>{storedAccounts.length}</span>
      </div>

      <ul className={classes.accounts}>
        <AccountList variant='blue2' state={state} />
      </ul>

      {error && (
        <p className={classes.error} role='alert'>
          <FormattedMessage
            id='account_switcher.error'
            defaultMessage='This account session is no longer available. Sign in again to add it.'
          />
        </p>
      )}

      <div className={classes.divider} />
      <AccountSwitcherActions variant='blue2' />
    </div>
  );
};
