import { List as ImmutableList, Map as ImmutableMap } from 'immutable';
import { describe, expect, test } from 'vitest';

import {
  groupConversations,
  groupedConversationRepresentatives,
} from './conversation_grouping';

const conversation = (
  id: string,
  conversationId: string | null,
  accounts: string[],
  lastStatus: string,
  unread = false,
) =>
  ImmutableMap({
    id,
    conversation_id: conversationId,
    accounts: ImmutableList(accounts),
    last_status: lastStatus,
    unread,
  });

describe('direct conversation grouping', () => {
  test('groups records from the same native conversation even when participants change', () => {
    const first = conversation('1', '100', ['alice'], '10');
    const second = conversation('2', '100', ['alice', 'carol'], '20');

    expect(groupConversations(ImmutableList([first, second]))).toEqual([
      [first, second],
    ]);
  });

  test('groups separate account-conversation rows with the same participants', () => {
    const first = conversation('1', '100', ['alice'], '10');
    const second = conversation('2', '200', ['alice'], '20');

    expect(groupConversations(ImmutableList([first, second]))).toEqual([
      [first, second],
    ]);
  });

  test('keeps sent and received rows for the same conversation together', () => {
    const sent = conversation('1', '100', ['joe'], '10');
    const received = conversation('2', '200', ['joe'], '20');

    expect(groupConversations(ImmutableList([sent, received]))).toEqual([
      [sent, received],
    ]);
  });

  test('groups legacy records with the same participants', () => {
    const first = conversation('1', null, ['alice'], '10');
    const second = conversation('2', null, ['alice'], '20');

    expect(groupConversations(ImmutableList([first, second]))).toEqual([
      [first, second],
    ]);
  });

  test('keeps every participant on the grouped representative for one thread', () => {
    const first = conversation('1', '100', ['alice'], '10');
    const second = conversation('2', '100', ['alice', 'carol'], '20', true);

    const [representative] = groupedConversationRepresentatives(
      ImmutableList([first, second]),
    );

    expect(representative.get('id')).toBe('2');
    expect(representative.get('accounts')).toEqual(
      ImmutableList(['alice', 'carol']),
    );
    expect(representative.get('unread')).toBe(true);
  });
});
