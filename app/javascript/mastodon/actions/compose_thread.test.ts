/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- Vitest records mocked Axios calls as any. */
import { fromJS } from 'immutable';

import api from 'mastodon/api';

import { composeReducer } from '../reducers/compose';

import {
  COMPOSE_THREAD_FAILURE,
  COMPOSE_THREAD_PROGRESS,
  removeComposeThreadItem,
  submitCompose,
  submitComposeThread,
} from './compose';

vi.mock('mastodon/api', () => ({
  default: vi.fn(),
}));

const makeState = () =>
  fromJS({
    compose: {
      text: 'First',
      spoiler: false,
      spoiler_text: '',
      content_type: 'text/markdown',
      in_reply_to: null,
      media_attachments: [],
      sensitive: false,
      privacy: 'public',
      poll: null,
      language: 'pt',
      quoted_status_id: null,
      quote_policy: 'public',
      idempotencyKey: 'first-key',
      thread_items: [
        {
          id: 'item-2',
          text: 'Second',
          spoiler_text: '',
          content_type: 'text/plain',
          media_attachments: [],
          sensitive: false,
          visibility: 'public',
          language: 'pt',
          idempotencyKey: 'second-key',
        },
        {
          id: 'item-3',
          text: 'Third',
          spoiler_text: '',
          content_type: 'text/markdown',
          media_attachments: [],
          sensitive: false,
          visibility: 'public',
          language: 'pt',
          idempotencyKey: 'third-key',
        },
      ],
      thread_published_ids: {},
    },
  });

describe('submitComposeThread', () => {
  test('removes an additional item without ever removing the base post', () => {
    const compose = makeState().get('compose');
    const reduced = composeReducer(compose, removeComposeThreadItem('item-2'));

    expect(
      (reduced.get('thread_items') as unknown as { size: number }).size,
    ).toBe(1);
    expect(reduced.getIn(['thread_items', 0, 'id'])).toBe('item-3');
    expect(reduced.get('text')).toBe('First');
  });

  test('blocks a duplicate submit while one is already active', () => {
    const state = makeState().setIn(['compose', 'is_submitting'], true);
    const dispatch = vi.fn();

    submitCompose()(dispatch, () => state);

    expect(dispatch).not.toHaveBeenCalled();
  });

  test('schedules one post through the native statuses endpoint', async () => {
    const scheduledAt = new Date(Date.now() + 600_000).toISOString();
    const request = vi.fn().mockResolvedValue({ data: { id: 'scheduled-1' } });
    vi.mocked(api).mockReturnValue({ request } as never);
    const state = makeState()
      .setIn(['compose', 'thread_items'], fromJS([]))
      .setIn(['compose', 'scheduled_at'], scheduledAt);

    submitCompose()(vi.fn(), () => state);
    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(1);
    });

    expect(request.mock.calls[0]?.[0]).toMatchObject({
      url: '/api/v1/statuses',
      method: 'post',
      data: expect.objectContaining({ scheduled_at: scheduledAt }),
      headers: { 'Idempotency-Key': 'first-key' },
    });
  });

  test('publishes strictly in order and chains real IDs with stable idempotency keys', async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: '101', account: { username: 'alice' } },
      })
      .mockResolvedValueOnce({
        data: { id: '102', account: { username: 'alice' } },
      })
      .mockResolvedValueOnce({
        data: { id: '103', account: { username: 'alice' } },
      });
    vi.mocked(api).mockReturnValue({ post } as never);
    let state = makeState();
    const dispatch = vi.fn(
      (action: { type?: string; index?: number; statusId?: string }) => {
        if (action.type === COMPOSE_THREAD_PROGRESS) {
          state = state.setIn(
            ['compose', 'thread_published_ids', String(action.index)],
            action.statusId,
          );
        }
        return action;
      },
    );

    await submitComposeThread(dispatch, () => state, null);

    expect(post).toHaveBeenCalledTimes(3);
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      status: 'First',
      in_reply_to_id: null,
    });
    expect(post.mock.calls[1]?.[1]).toMatchObject({
      status: 'Second',
      in_reply_to_id: '101',
    });
    expect(post.mock.calls[2]?.[1]).toMatchObject({
      status: 'Third',
      in_reply_to_id: '102',
    });
    expect(
      post.mock.calls.map((call) => call[2].headers['Idempotency-Key']),
    ).toEqual(['first-key', 'second-key', 'third-key']);
  });

  test('keeps its checkpoint after a partial failure and resumes without duplicating', async () => {
    const failure = new Error('temporary failure');
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: '201', account: { username: 'alice' } },
      })
      .mockRejectedValueOnce(failure);
    vi.mocked(api).mockReturnValue({ post } as never);
    let state = makeState();
    const dispatched: { type?: string; index?: number; statusId?: string }[] =
      [];
    const dispatch = vi.fn(
      (action: { type?: string; index?: number; statusId?: string }) => {
        dispatched.push(action);
        if (action.type === COMPOSE_THREAD_PROGRESS) {
          state = state.setIn(
            ['compose', 'thread_published_ids', String(action.index)],
            action.statusId,
          );
        }
        return action;
      },
    );

    await submitComposeThread(dispatch, () => state, null);
    expect(dispatched).toContainEqual(
      expect.objectContaining({ type: COMPOSE_THREAD_FAILURE, index: 1 }),
    );

    post.mockResolvedValueOnce({
      data: { id: '202', account: { username: 'alice' } },
    });
    post.mockResolvedValueOnce({
      data: { id: '203', account: { username: 'alice' } },
    });
    await submitComposeThread(dispatch, () => state, null);

    expect(post).toHaveBeenCalledTimes(4);
    expect(post.mock.calls[2]?.[1]).toMatchObject({
      status: 'Second',
      in_reply_to_id: '201',
    });
    expect(post.mock.calls[3]?.[1]).toMatchObject({
      status: 'Third',
      in_reply_to_id: '202',
    });
  });

  test('creates one durable scheduled-thread request instead of independent scheduled posts', async () => {
    const post = vi
      .fn()
      .mockResolvedValue({ data: { id: 'scheduled-thread-1' } });
    vi.mocked(api).mockReturnValue({ post } as never);
    const state = makeState();
    const scheduledAt = new Date(Date.now() + 600_000).toISOString();

    await submitComposeThread(vi.fn(), () => state, scheduledAt);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      '/api/v1/scheduled_threads',
      expect.objectContaining({
        scheduled_at: scheduledAt,
        items: expect.arrayContaining([
          expect.objectContaining({ status: 'First' }),
          expect.objectContaining({ status: 'Third' }),
        ]),
      }),
      { headers: { 'Idempotency-Key': 'first-key' } },
    );
  });
});
