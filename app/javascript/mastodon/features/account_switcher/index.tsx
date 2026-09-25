import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { FormattedMessage, useIntl } from 'react-intl';

import api from '@/mastodon/api';
import { Avatar } from '@/mastodon/components/avatar';
import { Popover } from '@/mastodon/components/popover';
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
  const next = readStoredAccounts().filter((account) => account.id !== accountId);
  writeStoredAccounts(next);
  return next;
};

const switchToStoredAccount = async (account: StoredAccount) => {
  await api(false).post('/auth/account_switcher/switch', {
    token: account.token,
  });

  window.location.assign(window.location.href);
};

export const AccountSwitcher: React.FC = () => {
  const intl = useIntl();
  const { signedIn, accountId } = useIdentity();
  const account = useAccount(accountId);
  const accessToken = getAccessToken();

  const [storedAccounts, setStoredAccounts] =
    useState<StoredAccount[]>(readStoredAccounts);
  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!signedIn || !account || !accountId || !accessToken) {
      return;
    }

    const next = upsertStoredAccount({
      id: accountId,
      acct: account.acct,
      username: account.username,
      displayName: account.display_name.trim() || account.username,
      avatar: account.avatar,
      url: account.url ?? '',
      token: accessToken,
      lastUsedAt: Date.now(),
    });

    setStoredAccounts(next);
  }, [accessToken, account, accountId, signedIn]);

  const handleOpen = useCallback(() => {
    setError(false);
    setOpen((value) => !value);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    anchor?.focus({ preventScroll: true });
  }, [anchor]);

  const handleSwitch = useCallback(
    async (target: StoredAccount) => {
      if (target.id === accountId) {
        setOpen(false);
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

  const handleRemove = useCallback(
    (event: React.MouseEvent, targetId: string) => {
      event.stopPropagation();

      if (targetId === accountId) {
        return;
      }

      setStoredAccounts(removeStoredAccount(targetId));
    },
    [accountId],
  );

  if (!signedIn || !account || !accountId || !accessToken) {
    return null;
  }

  const accountLabel = intl.formatMessage({
    id: 'account_switcher.label',
    defaultMessage: 'Switch account',
  });

  const switcher = (
    <div className={classes.root}>
      <button
        ref={setAnchor}
        type='button'
        className={classes.trigger}
        aria-label={accountLabel}
        aria-expanded={open}
        aria-haspopup='menu'
        onClick={handleOpen}
      >
        <Avatar account={account} size={40} />
      </button>

      {open && anchor && (
        <Popover
          isOpen={open}
          onClose={handleClose}
          reference={anchor}
          placement='bottom-end'
          strategy='fixed'
          offset={8}
        >
          {({ props: popoverProps }) => (
            <div
              {...popoverProps}
              className={classes.panel}
              role='menu'
              aria-label={accountLabel}
            >
              <div className={classes.header}>
                <FormattedMessage
                  id='account_switcher.title'
                  defaultMessage='Accounts'
                />
                <span className={classes.count}>{storedAccounts.length}</span>
              </div>

              <div className={classes.accounts}>
                {storedAccounts.map((storedAccount) => {
                  const active = storedAccount.id === accountId;
                  const label =
                    storedAccount.displayName || storedAccount.username;

                  return (
                    <div
                      key={storedAccount.id}
                      className={classes.accountRow}
                      role='none'
                    >
                      <button
                        type='button'
                        className={classes.accountButton}
                        role='menuitem'
                        aria-current={active ? 'page' : undefined}
                        disabled={switchingId !== null}
                        onClick={() => {
                          void handleSwitch(storedAccount);
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
                          onClick={(event) =>
                            handleRemove(event, storedAccount.id)
                          }
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {error && (
                <p className={classes.error} role='alert'>
                  <FormattedMessage
                    id='account_switcher.error'
                    defaultMessage='This account session is no longer available. Sign in again to add it.'
                  />
                </p>
              )}

              <div className={classes.divider} />

              <a
                href='/auth/sign_in?account_switcher=1'
                className={classes.action}
                role='menuitem'
                onClick={handleClose}
              >
                <FormattedMessage
                  id='account_switcher.sign_in'
                  defaultMessage='Sign in to another account'
                />
              </a>

              {registrationsOpen && (
                <a
                  href='/auth/sign_up?account_switcher=1'
                  className={classes.action}
                  role='menuitem'
                  onClick={handleClose}
                >
                  <FormattedMessage
                    id='account_switcher.create'
                    defaultMessage='Create another account'
                  />
                </a>
              )}
            </div>
          )}
        </Popover>
      )}
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(switcher, document.body)
    : switcher;
};
