import { useCallback, useMemo } from 'react';

import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';

import { useLocation } from 'react-router';

import {
  addColumn,
  moveColumn,
  removeColumn,
} from '@/mastodon/actions/columns';
import { useAccountId } from '@/mastodon/hooks/useAccountId';
import { forceSingleColumn } from '@/mastodon/initial_state';
import { isBlue2MobileViewport } from '@/mastodon/is_mobile';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import { useColumnIndexContext } from '@/mastodon/components/column/context';
import { useColumnsContext } from './columns_context';

type Blue2ColumnState = ImmutableMap<string, unknown>;

export interface Blue2ColumnDefinition {
  id: string;
  params: Record<string, unknown>;
}

const normalizePath = (pathname: string) => {
  if (pathname === '/deck') {
    return '/home';
  }

  if (pathname.startsWith('/deck/')) {
    return pathname.slice(5) || '/home';
  }

  return pathname;
};

const definitionForPath = (
  pathname: string,
  accountId: string | null | undefined,
): Blue2ColumnDefinition | null => {
  const path = normalizePath(pathname);

  if (path === '/home' || path === '/timelines/home') {
    return { id: 'HOME', params: {} };
  }

  if (path === '/notifications') {
    return { id: 'NOTIFICATIONS', params: {} };
  }

  if (path === '/public') {
    return { id: 'PUBLIC', params: {} };
  }

  if (path === '/public/remote') {
    return {
      id: 'REMOTE',
      params: { other: { onlyRemote: true } },
    };
  }

  if (path === '/public/local') {
    return {
      id: 'COMMUNITY',
      params: { other: { onlyMedia: false } },
    };
  }

  if (path === '/conversations' || path === '/timelines/direct') {
    return { id: 'DIRECT', params: {} };
  }

  if (path === '/explore') {
    return { id: 'EXPLORE', params: {} };
  }

  if (path === '/search') {
    return { id: 'SEARCH', params: {} };
  }

  if (path === '/directory') {
    return {
      id: 'DIRECTORY',
      params: { order: 'active', local: true },
    };
  }

  if (path === '/bookmarks') {
    return { id: 'BOOKMARKS', params: {} };
  }

  if (path === '/lists') {
    return { id: 'LISTS', params: {} };
  }

  const listMatch = /^\/lists\/([^/]+)$/.exec(path);
  if (listMatch) {
    return { id: 'LIST', params: { id: listMatch[1] } };
  }

  if (path === '/followed_tags') {
    return { id: 'FOLLOWED_TAGS', params: {} };
  }

  if (path === '/blocks') {
    return { id: 'BLOCKS', params: {} };
  }

  if (path === '/mutes') {
    return { id: 'MUTES', params: {} };
  }

  if (path === '/domain_blocks') {
    return { id: 'DOMAIN_BLOCKS', params: {} };
  }

  if (path === '/follow_requests') {
    return { id: 'FOLLOW_REQUESTS', params: {} };
  }

  const hashtagMatch = /^\/tags\/([^/]+)$/.exec(path);
  if (hashtagMatch) {
    return { id: 'HASHTAG', params: { id: decodeURIComponent(hashtagMatch[1]) } };
  }

  const collectionsMatch = /^\/@[^/]+\/collections(?:\/featuring-you)?$/.exec(
    path,
  );
  if (collectionsMatch && accountId) {
    return {
      id: 'COLLECTIONS',
      params: {
        accountId,
        featuringYou: path.endsWith('/featuring-you'),
      },
    };
  }

  if (/^\/@[^/]+$/.test(path) && accountId) {
    return { id: 'ACCOUNT', params: { accountId } };
  }

  return null;
};

export const useBlue2ColumnPinning = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { multiColumn } = useColumnsContext();
  const columnIndex = useColumnIndexContext();
  const accountId = useAccountId();
  const columns = useAppSelector(
    (state) => state.settings.get('columns') as ImmutableList<Blue2ColumnState>,
  );

  const isBlue2 =
    typeof document !== 'undefined' &&
    document.body.dataset.theme === 'blue-2';
  const isDesktopAdvanced =
    isBlue2 &&
    !forceSingleColumn &&
    typeof window !== 'undefined' &&
    !isBlue2MobileViewport(window.innerWidth) &&
    multiColumn;

  const pinned = isDesktopAdvanced && columnIndex < columns.size;
  const pinnedColumn = pinned ? columns.get(columnIndex) : undefined;
  const pinnedParams = pinnedColumn?.get('params') as
    | ImmutableMap<string, unknown>
    | undefined;
  const routeDefinition = useMemo(
    () => definitionForPath(location.pathname, accountId),
    [accountId, location.pathname],
  );

  const definition = pinned
    ? {
        id: pinnedColumn?.get('id'),
        params: pinnedParams?.toJS() ?? {},
      }
    : routeDefinition;

  const pinnedUuid = pinnedColumn?.get('uuid');

  const handlePin = useCallback(() => {
    if (pinnedUuid) {
      dispatch(removeColumn(pinnedUuid));
      return;
    }

    if (routeDefinition) {
      dispatch(addColumn(routeDefinition.id, routeDefinition.params));
    }
  }, [dispatch, pinnedUuid, routeDefinition]);

  const handleMove = useCallback(
    (direction: number) => {
      if (pinnedUuid) {
        dispatch(moveColumn(pinnedUuid, direction));
      }
    },
    [dispatch, pinnedUuid],
  );

  return {
    active: isDesktopAdvanced,
    canPin: isDesktopAdvanced && !!definition,
    pinned,
    onPin: handlePin,
    onMove: handleMove,
  };
};
