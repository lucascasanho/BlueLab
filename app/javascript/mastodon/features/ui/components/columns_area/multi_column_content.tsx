import { Children, cloneElement, isValidElement } from 'react';

import type { List, Record } from 'immutable';

import { ColumnIndexContext } from '@/mastodon/components/column/context';
import { useAppSelector } from '@/mastodon/store';
import { isRedesignEnabled } from '@/mastodon/utils/environment';

import {
  Compose,
  Notifications,
  HomeTimeline,
  CommunityTimeline,
  PublicTimeline,
  HashtagTimeline,
  DirectTimeline,
  FavouritedStatuses,
  BookmarkedStatuses,
  ListTimeline,
  Lists,
  Directory,
  Explore,
  Search,
  AccountTimeline,
  Collections,
  FollowedTags,
  Blocks,
  DomainBlocks,
  Mutes,
  FollowRequests,
} from '../../util/async-components';
import Bundle from '../bundle';
import { BundleColumnError } from '../bundle_column_error';
import { ColumnLoading } from '../column_loading';
import DrawerLoading from '../drawer_loading';

const componentMap = {
  COMPOSE: Compose,
  HOME: HomeTimeline,
  NOTIFICATIONS: Notifications,
  PUBLIC: PublicTimeline,
  REMOTE: PublicTimeline,
  COMMUNITY: CommunityTimeline,
  HASHTAG: HashtagTimeline,
  DIRECT: DirectTimeline,
  FAVOURITES: FavouritedStatuses,
  BOOKMARKS: BookmarkedStatuses,
  LIST: ListTimeline,
  LISTS: Lists,
  DIRECTORY: Directory,
  EXPLORE: Explore,
  SEARCH: Search,
  ACCOUNT: AccountTimeline,
  COLLECTIONS: Collections,
  FOLLOWED_TAGS: FollowedTags,
  BLOCKS: Blocks,
  DOMAIN_BLOCKS: DomainBlocks,
  MUTES: Mutes,
  FOLLOW_REQUESTS: FollowRequests,
} as const;

interface Column {
  uuid: string;
  id: keyof typeof componentMap;
  params?: null | Record<{
    other?: unknown;
    id?: unknown;
    accountId?: unknown;
    featuringYou?: unknown;
    order?: unknown;
    local?: unknown;
  }>;
}

type FetchedComponent = React.FC<{
  columnId?: string;
  multiColumn?: boolean;
  params: unknown;
}>;

const ErrorComponent = (props: { onRetry: () => void }) => (
  <BundleColumnError multiColumn errorType='network' {...props} />
);

const renderLoading = (columnId: string) => {
  const LoadingComponent =
    columnId === 'COMPOSE' ? <DrawerLoading /> : <ColumnLoading multiColumn />;
  return () => LoadingComponent;
};

export const MultiColumnContent: React.FC<{
  children: React.ReactElement | React.ReactElement[];
}> = ({ children }) => {
  const isBlue2 =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';
  const columns = useAppSelector(
    (state) => state.settings.get('columns') as List<Record<Column>>,
  );
  return (
    <>
      {columns.map((column, index) => {
        const params = column.get('params')
          ? column.get('params')?.toJS()
          : null;
        const other = params?.other ?? {};
        const columnAccountId =
          typeof params?.accountId === 'string' ? params.accountId : undefined;
        const featuringYou = params?.featuringYou === true;
        const uuid = column.get('uuid');
        const id = column.get('id');

        // BlueLab owns compose through the fixed Blue2 button. Do not retain a
        // legacy Compose column when an upstream preference flag is disabled.
        if ((isRedesignEnabled() || isBlue2) && id === 'COMPOSE') {
          return null;
        }

        return (
          <ColumnIndexContext.Provider value={index} key={uuid}>
            <Bundle
              key={uuid}
              fetchComponent={componentMap[id]}
              loading={renderLoading(id)}
              error={ErrorComponent}
            >
              {(SpecificComponent: FetchedComponent) => (
                <SpecificComponent
                  columnId={uuid}
                  params={params}
                  multiColumn
                  {...other}
                  {...(id === 'ACCOUNT' ? { accountId: columnAccountId } : {})}
                  {...(id === 'COLLECTIONS'
                    ? {
                        accountId: columnAccountId,
                        featuringYou,
                      }
                    : {})}
                />
              )}
            </Bundle>
          </ColumnIndexContext.Provider>
        );
      })}

      <ColumnIndexContext.Provider value={columns.size}>
        {Children.map(children, (child) =>
          isValidElement<{ multiColumn?: boolean }>(child)
            ? cloneElement(child, { multiColumn: true })
            : child,
        )}
      </ColumnIndexContext.Provider>
    </>
  );
};
