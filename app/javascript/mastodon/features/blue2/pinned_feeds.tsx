import { useCallback, useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import { HashIcon, PlusIcon, RssSimpleIcon } from '@phosphor-icons/react';

import { changeSetting } from '@/mastodon/actions/settings';
import { fetchLists } from '@/mastodon/actions/lists';
import { Button } from '@/mastodon/components/button/redesign';
import {
  Menu,
  MenuItem,
  MenuItemDivider,
  MenuItemGroup,
  MenuList,
  MenuTrigger,
} from '@/mastodon/components/menu';
import { fetchFollowedHashtags } from '@/mastodon/actions/tags_typed';
import { useCurrentAccountId } from '@/mastodon/hooks/useAccountId';
import { useIdentity } from '@/mastodon/identity_context';
import { getOrderedLists } from '@/mastodon/selectors/lists';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import classes from './pinned_feeds.module.scss';

export interface Blue2PinnedFeed {
  key: string;
  type: 'list' | 'hashtag';
  id: string;
  title: string;
  path: string;
}

const STORAGE_PREFIX = 'bluelab-blue2-pinned-feeds';

const getStorageKey = (accountId: string | null | undefined) =>
  accountId ? `${STORAGE_PREFIX}:${accountId}` : STORAGE_PREFIX;

const readPinnedFeeds = (
  accountId: string | null | undefined,
): Blue2PinnedFeed[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(getStorageKey(accountId));
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (feed): feed is Blue2PinnedFeed =>
        !!feed &&
        typeof feed === 'object' &&
        'key' in feed &&
        'type' in feed &&
        'id' in feed &&
        'title' in feed &&
        'path' in feed &&
        (feed.type === 'list' || feed.type === 'hashtag') &&
        typeof feed.key === 'string' &&
        typeof feed.id === 'string' &&
        typeof feed.title === 'string' &&
        typeof feed.path === 'string',
    );
  } catch {
    return [];
  }
};

const parsePinnedFeeds = (value: unknown): Blue2PinnedFeed[] => {
  let parsed: unknown = value;

  if (
    parsed &&
    typeof parsed === 'object' &&
    'toJS' in parsed &&
    typeof parsed.toJS === 'function'
  ) {
    parsed = parsed.toJS();
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.filter(
    (feed): feed is Blue2PinnedFeed =>
      !!feed &&
      typeof feed === 'object' &&
      'key' in feed &&
      'type' in feed &&
      'id' in feed &&
      'title' in feed &&
      'path' in feed &&
      (feed.type === 'list' || feed.type === 'hashtag') &&
      typeof feed.key === 'string' &&
      typeof feed.id === 'string' &&
      typeof feed.title === 'string' &&
      typeof feed.path === 'string',
  );
};


export const useBlue2PinnedFeeds = () => {
  const { signedIn } = useIdentity();
  const accountId = useCurrentAccountId();
  const dispatch = useAppDispatch();
  const serverPinnedFeeds = useAppSelector((state) =>
    state.settings.getIn(['blue2', 'pinned_feeds']),
  );

  const [legacyFeeds, setLegacyFeeds] = useState<Blue2PinnedFeed[]>(() =>
    readPinnedFeeds(accountId),
  );

  useEffect(() => {
    setLegacyFeeds(readPinnedFeeds(accountId));
  }, [accountId]);

  const serverValueExists =
    serverPinnedFeeds !== undefined && serverPinnedFeeds !== null;

  const feeds = serverValueExists
    ? parsePinnedFeeds(serverPinnedFeeds)
    : legacyFeeds;

  useEffect(() => {
    if (!signedIn || !accountId || serverValueExists || legacyFeeds.length === 0) {
      return;
    }

    // The first device that already has the old localStorage-based pins
    // migrates them into Mastodon's per-user Web::Setting. Subsequent devices
    // receive the same list from the server.
    dispatch(changeSetting(['blue2', 'pinned_feeds'], legacyFeeds));
  }, [
    accountId,
    dispatch,
    legacyFeeds,
    serverValueExists,
    signedIn,
  ]);

  const updateFeeds = useCallback(
    (next: Blue2PinnedFeed[]) => {
      dispatch(changeSetting(['blue2', 'pinned_feeds'], next));
    },
    [dispatch],
  );

  const addFeed = useCallback(
    (feed: Blue2PinnedFeed) => {
      if (!signedIn || feeds.some((item) => item.key === feed.key)) return;
      updateFeeds([...feeds, feed]);
    },
    [feeds, signedIn, updateFeeds],
  );

  const removeFeed = useCallback(
    (key: string) => {
      updateFeeds(feeds.filter((feed) => feed.key !== key));
    },
    [feeds, updateFeeds],
  );

  return {
    feeds,
    addFeed,
    removeFeed,
  };
};
export const createPinnedListFeed = (
  id: string,
  title: string,
): Blue2PinnedFeed => ({
  key: `list:${id}`,
  type: 'list',
  id,
  title,
  path: `/lists/${id}`,
});

export const createPinnedHashtagFeed = (tag: string): Blue2PinnedFeed => {
  const normalizedTag = tag.trim().replace(/^#+/, '');
  return {
    key: `hashtag:${normalizedTag.toLowerCase()}`,
    type: 'hashtag',
    id: normalizedTag,
    title: `#${normalizedTag}`,
    path: `/tags/${encodeURIComponent(normalizedTag)}`,
  };
};

interface Blue2PinnedFeedMenuProps {
  showRemoveSection?: boolean;
}

export const Blue2PinnedFeedMenu: React.FC<Blue2PinnedFeedMenuProps> = ({
  showRemoveSection = true,
}) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const { signedIn } = useIdentity();
  const { feeds, addFeed, removeFeed } = useBlue2PinnedFeeds();
  const lists = useAppSelector((state) => getOrderedLists(state));
  const followedHashtags = useAppSelector((state) => state.followedTags.tags);

  useEffect(() => {
    if (!signedIn) return;

    void dispatch(fetchLists());
    void dispatch(fetchFollowedHashtags());
  }, [dispatch, signedIn]);

  const pinnedKeys = new Set(feeds.map((feed) => feed.key));
  const availableLists = lists.filter(
    (list) => !pinnedKeys.has(`list:${list.id}`),
  );
  const availableHashtags = followedHashtags.filter(
    (tag) => !pinnedKeys.has(`hashtag:${tag.name.toLowerCase()}`),
  );

  const handleAddHashtag = useCallback(() => {
    const value = window.prompt(
      intl.formatMessage({
        id: 'blue2.pinned_feeds.hashtag_prompt',
        defaultMessage: 'Enter a hashtag to pin',
      }),
    );

    if (!value?.trim()) return;

    const feed = createPinnedHashtagFeed(value);
    if (!feed.id || /\\s/.test(feed.id)) return;

    addFeed(feed);
  }, [addFeed, intl]);

  if (!signedIn) return null;

  return (
    <Menu noFocus>
      <MenuTrigger
        as={Button}
        leadingIcon={PlusIcon}
        variant='ghost'
        color='neutral'
        size='sm'
        className={classes.addButton}
        aria-label={intl.formatMessage({
          id: 'blue2.pinned_feeds.add',
          defaultMessage: 'Add pinned timeline',
        })}
      >
        <span className='sr-only'>
          <FormattedMessage
            id='blue2.pinned_feeds.add'
            defaultMessage='Add pinned timeline'
          />
        </span>
      </MenuTrigger>

      <MenuList
        portal
        placement='bottom-end'
        maxWidth={300}
        mobilePresentation='popover'
      >
        <MenuItemGroup
          label={
            <FormattedMessage
              id='blue2.pinned_feeds.lists'
              defaultMessage='Lists'
            />
          }
        >
          {availableLists.length > 0 ? (
            availableLists.map((list) => (
              <MenuItem
                key={list.id}
                icon={RssSimpleIcon}
                onClick={() => addFeed(createPinnedListFeed(list.id, list.title))}
              >
                {list.title}
              </MenuItem>
            ))
          ) : (
            <div className={classes.emptyItem}>
              <FormattedMessage
                id='blue2.pinned_feeds.no_lists'
                defaultMessage='No lists available to pin'
              />
            </div>
          )}
        </MenuItemGroup>

        <MenuItemDivider />

        <MenuItemGroup
          label={
            <FormattedMessage
              id='blue2.pinned_feeds.hashtags'
              defaultMessage='Followed hashtags'
            />
          }
        >
          {availableHashtags.length > 0 ? (
            availableHashtags.map((tag) => (
              <MenuItem
                key={tag.name}
                icon={HashIcon}
                onClick={() => addFeed(createPinnedHashtagFeed(tag.name))}
              >
                #{tag.name}
              </MenuItem>
            ))
          ) : (
            <div className={classes.emptyItem}>
              <FormattedMessage
                id='blue2.pinned_feeds.no_hashtags'
                defaultMessage='No followed hashtags available'
              />
            </div>
          )}

          <MenuItem
            icon={HashIcon}
            onClick={handleAddHashtag}
          >
            <FormattedMessage
              id='blue2.pinned_feeds.add_hashtag'
              defaultMessage='Pin another hashtag…'
            />
          </MenuItem>
        </MenuItemGroup>

        {showRemoveSection && feeds.length > 0 && (
          <>
            <MenuItemDivider />
            <MenuItemGroup
              label={
                <FormattedMessage
                  id='blue2.pinned_feeds.remove'
                  defaultMessage='Remove pinned timelines'
                />
              }
            >
              {feeds.map((feed) => (
                <MenuItem key={`remove:${feed.key}`} onClick={() => removeFeed(feed.key)}>
                  {feed.title}
                </MenuItem>
              ))}
            </MenuItemGroup>
          </>
        )}
      </MenuList>
    </Menu>
  );
};

export const Blue2PinnedFeedTabs: React.FC<{
  activeKey: string | null;
  onSelect: (key: string) => void;
  tabClassName: string;
  activeTabClassName: string;
  showIcons?: boolean;
}> = ({
  activeKey,
  onSelect,
  tabClassName,
  activeTabClassName,
  showIcons = true,
}) => {
  const { feeds } = useBlue2PinnedFeeds();

  return (
    <>
      {feeds.map((feed) => (
        <button
          key={feed.key}
          type='button'
          className={
            activeKey === feed.key ? activeTabClassName : tabClassName
          }
          onClick={() => onSelect(feed.key)}
        >
          {showIcons && feed.type === 'list' && (
            <RssSimpleIcon size={15} />
          )}
          {feed.title}
        </button>
      ))}
    </>
  );
};
