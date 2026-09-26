import { useEffect } from 'react';

import { useLocation, useParams } from 'react-router';

import { fetchAccount, lookupAccount } from 'mastodon/actions/accounts';
import { normalizeForLookup } from 'mastodon/reducers/accounts_map';
import {
  createAppSelector,
  useAppDispatch,
  useAppSelector,
} from 'mastodon/store';

interface Params {
  acct?: string;
  id?: string;
}

const selectNormalizedId = createAppSelector(
  [
    (state) => state.accounts_map,
    (_, acct?: string) => acct,
    (_, _acct, id?: string) => id,
  ],
  (accountsMap, acct, id) => {
    if (id) {
      return id;
    }
    if (acct) {
      return accountsMap[normalizeForLookup(acct)];
    }
    return undefined;
  },
);

export type AccountId = string | null | undefined;

export function useAccountId() {
  const { acct, id } = useParams<Params>();
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();
  const accountId = useAppSelector((state) =>
    selectNormalizedId(state, acct, id),
  );
  const account = useAppSelector((state) =>
    accountId ? state.accounts.get(accountId) : undefined,
  );
  const accountInStore = !!account;

  useEffect(() => {
    if (typeof accountId === 'undefined' && acct) {
      dispatch(lookupAccount(acct));
    } else if (
      accountId &&
      !accountInStore &&
      (pathname.startsWith('/accounts/') || !!acct)
    ) {
      dispatch(fetchAccount(accountId));
    }
  }, [dispatch, accountId, acct, accountInStore, pathname]);

  return accountId satisfies AccountId;
}

export function useCurrentAccountId() {
  return useAppSelector((state) => state.meta.get('me', null) as string | null);
}
