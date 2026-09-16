import { fromJS, isIndexed } from 'immutable';

import { hydrateCompose } from './compose';
import { importFetchedAccounts } from './importer';
import { hydrateSearch } from './search';

export const STORE_HYDRATE = 'STORE_HYDRATE';
export const STORE_HYDRATE_LAZY = 'STORE_HYDRATE_LAZY';

const convertState = rawState =>
  fromJS(rawState, (k, v) =>
    isIndexed(v) ? v.toList() : v.toMap());

export function hydrateStore(rawState) {
  const state = convertState({
    ...rawState,
    compose: rawState.compose
      ? {
          ...rawState.compose,
          default_content_type: 'text/markdown',
        }
      : rawState.compose,
  });

  return dispatch => {
    dispatch({
      type: STORE_HYDRATE,
      state,
    });

    dispatch(hydrateCompose());
    dispatch(hydrateSearch());
    if (rawState.accounts) {
      dispatch(importFetchedAccounts(Object.values(rawState.accounts)));
    }
  };
}
