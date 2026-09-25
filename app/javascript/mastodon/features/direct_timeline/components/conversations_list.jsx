import PropTypes from 'prop-types';
import { useRef, useMemo, useCallback } from 'react';

import { useSelector, useDispatch } from 'react-redux';

import { debounce } from 'lodash';

import { expandConversations } from 'mastodon/actions/conversations';
import ScrollableList from 'mastodon/components/scrollable_list';

import { Conversation } from './conversation';

export const ConversationsList = ({ scrollKey, ...other }) => {
  const listRef = useRef();
  const conversations = useSelector(state => state.getIn(['conversations', 'items']));
  const isLoading = useSelector(state => state.getIn(['conversations', 'isLoading'], true));
  const hasMore = useSelector(state => state.getIn(['conversations', 'hasMore'], false));
  const dispatch = useDispatch();

  const groupedConversations = useMemo(() => {
    const groups = new Map();

    conversations.forEach(conversation => {
      const accountIds = conversation
        .get('accounts')
        .sort()
        .join(',');

      if (!groups.has(accountIds)) {
        groups.set(accountIds, conversation);
        return;
      }

      const current = groups.get(accountIds);
      const currentStatusId = current.get('last_status');
      const nextStatusId = conversation.get('last_status');

      if (
        nextStatusId &&
        (!currentStatusId || nextStatusId.localeCompare(currentStatusId) > 0)
      ) {
        groups.set(accountIds, conversation.set(
          'unread',
          current.get('unread') || conversation.get('unread'),
        ));
      } else if (conversation.get('unread') && !current.get('unread')) {
        groups.set(accountIds, current.set('unread', true));
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      const aStatusId = a.get('last_status');
      const bStatusId = b.get('last_status');

      if (!aStatusId || !bStatusId) {
        return 0;
      }

      return bStatusId.localeCompare(aStatusId);
    });
  }, [conversations]);

  const lastStatusId = groupedConversations.at(-1)?.get('last_status');

  const debouncedLoadMore = useMemo(() => debounce(id => {
    dispatch(expandConversations({ maxId: id }));
  }, 300, { leading: true }), [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (lastStatusId) {
      debouncedLoadMore(lastStatusId);
    }
  }, [debouncedLoadMore, lastStatusId]);

  return (
    <ScrollableList {...other} scrollKey={scrollKey} isLoading={isLoading} showLoading={isLoading && conversations.isEmpty()} hasMore={hasMore} onLoadMore={handleLoadMore} ref={listRef}>
      {groupedConversations.map(item => (
        <Conversation
          key={item.get('id')}
          conversation={item}
          scrollKey={scrollKey}
        />
      ))}
    </ScrollableList>
  );
};

ConversationsList.propTypes = {
  scrollKey: PropTypes.string.isRequired,
};
