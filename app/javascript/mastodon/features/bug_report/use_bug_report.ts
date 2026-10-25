import { useCallback } from 'react';

import { openModal } from '@/mastodon/actions/modal';
import { closeNavigation } from '@/mastodon/actions/navigation';
import { useAppDispatch } from '@/mastodon/store';

export const useOpenBugReport = () => {
  const dispatch = useAppDispatch();

  return useCallback(() => {
    dispatch(closeNavigation());
    dispatch(
      openModal({
        modalType: 'BUG_REPORT',
        modalProps: {},
      }),
    );
  }, [dispatch]);
};
