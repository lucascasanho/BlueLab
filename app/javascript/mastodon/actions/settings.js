import { debounce } from 'lodash';

import api from '../api';

import { showAlertForError } from './alerts';

export const SETTING_CHANGE = 'SETTING_CHANGE';
export const SETTING_SAVE   = 'SETTING_SAVE';

let skipBestEffortCsrfSaves = false;

const isCsrfAuthenticityError = error => {
  const message = error?.response?.data?.error;

  return (
    error?.response?.status === 422 &&
    typeof message === 'string' &&
    message.toLowerCase().includes('csrf')
  );
};

export function changeSetting(path, value) {
  return dispatch => {
    dispatch({
      type: SETTING_CHANGE,
      path,
      value,
    });

    dispatch(saveSettings());
  };
}

const debouncedSave = debounce((dispatch, getState, options = {}) => {
  const { bestEffortCsrf = false } = options;

  if (
    getState().getIn(['settings', 'saved']) ||
    !getState().getIn(['meta', 'me']) ||
    (bestEffortCsrf && skipBestEffortCsrfSaves)
  ) {
    return;
  }

  const data = getState().get('settings').filter((_, path) => path !== 'saved').toJS();

  api().put('/api/web/settings', { data })
    .then(() => {
      skipBestEffortCsrfSaves = false;
      dispatch({ type: SETTING_SAVE });
    })
    .catch(error => {
      if (bestEffortCsrf && isCsrfAuthenticityError(error)) {
        // Frequently-used emoji persistence is auxiliary. A mobile/PWA session
        // can keep working through its API token while the web-session CSRF
        // token has expired. Do not surface a misleading toast on every emoji
        // pick, and stop retrying this best-effort write for the current page.
        skipBestEffortCsrfSaves = true;
        return;
      }

      dispatch(showAlertForError(error));
    });
}, 2000, { leading: true, trailing: true });

export function saveSettings(options = {}) {
  return (dispatch, getState) => debouncedSave(dispatch, getState, options);
}
