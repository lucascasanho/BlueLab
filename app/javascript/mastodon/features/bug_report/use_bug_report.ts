import { useCallback } from 'react';

import { closeNavigation } from '@/mastodon/actions/navigation';
import { openModal } from '@/mastodon/actions/modal';
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
