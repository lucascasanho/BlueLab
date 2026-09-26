import { List as ImmutableList } from 'immutable';

import { compareId } from '@/mastodon/compare_id';

const conversationKey = (conversation) => {
  const nativeConversationId = conversation.get('conversation_id');

  return nativeConversationId
    ? `thread:${nativeConversationId}`
    : `record:${conversation.get('id')}`;
};

const related = (left, right) =>
  conversationKey(left) === conversationKey(right);

export const groupConversations = (conversations) => {
  const groups = [];

  conversations.forEach((conversation) => {
    const matchingIndexes = [];

    groups.forEach((group, index) => {
      if (group.some((item) => related(item, conversation))) {
        matchingIndexes.push(index);
      }
    });

    if (matchingIndexes.length === 0) {
      groups.push([conversation]);
      return;
    }

    const merged = matchingIndexes.flatMap((index) => groups[index]);
    merged.push(conversation);

    [...matchingIndexes].reverse().forEach((index) => {
      groups.splice(index, 1);
    });

    groups.push(merged);
  });

  return groups;
};

const newestConversation = (group) =>
  group.reduce((newest, conversation) => {
    const newestId = newest.get('last_status');
    const currentId = conversation.get('last_status');

    if (!newestId) return conversation;
    if (!currentId) return newest;

    return compareId(currentId, newestId) > 0 ? conversation : newest;
  }, group[0]);

export const groupedConversationRepresentatives = (conversations) =>
  groupConversations(conversations)
    .map((group) => {
      const representative = newestConversation(group);
      const accounts = group
        .reduce(
          (combined, conversation) =>
            combined.concat(conversation.get('accounts')),
          ImmutableList(),
        )
        .toSet()
        .toList();

      return representative
        .set('accounts', accounts)
        .set(
          'unread',
          group.some((conversation) => conversation.get('unread')),
        );
    })
    .sort((a, b) => {
      const aId = a.get('last_status');
      const bId = b.get('last_status');

      if (!aId && !bId) return 0;
      if (!aId) return 1;
      if (!bId) return -1;

      return compareId(bId, aId);
    });
