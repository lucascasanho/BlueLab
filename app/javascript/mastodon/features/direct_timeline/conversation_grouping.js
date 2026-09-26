import { compareId } from '@/mastodon/compare_id';

const participantKey = (conversation) =>
  conversation
    .get('accounts')
    .sort()
    .join(',');

const conversationKey = (conversation) =>
  conversation.get('conversation_id');

const related = (left, right) => {
  const leftConversationKey = conversationKey(left);
  const rightConversationKey = conversationKey(right);

  return (
    participantKey(left) === participantKey(right) ||
    (!!leftConversationKey &&
      !!rightConversationKey &&
      leftConversationKey === rightConversationKey)
  );
};

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

    const merged = [conversation];

    [...matchingIndexes].reverse().forEach((index) => {
      merged.push(...groups[index]);
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
      return representative.set(
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
