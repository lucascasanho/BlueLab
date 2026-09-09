import { configureStore } from '@reduxjs/toolkit';

import {
  changeCompose,
  resetCompose,
  submitComposeSuccess,
} from '@/mastodon/actions/compose';
import type { PersistedComposeDraft } from '@/mastodon/actions/compose_draft';
import { reducerWithInitialState, rootReducer } from '@/mastodon/reducers';
import { defaultMiddleware } from '@/mastodon/store/store';

import {
  clearPersistedComposeDraft,
  readPersistedComposeDraft,
  startComposeDraftPersistence,
  writePersistedComposeDraft,
} from './draft_persistence';

const accountOne = 'account-1';
const accountTwo = 'account-2';

const draft = (text = 'A persistent draft'): PersistedComposeDraft => ({
  id: null,
  text,
  content_type: 'text/markdown',
  spoiler: true,
  spoiler_text: 'Content warning',
  in_reply_to: 'status-1',
  privacy: 'private',
  sensitive: true,
  language: 'pt',
  media_attachments: [
    {
      id: 'media-1',
      type: 'image',
      url: 'https://example.com/image.jpg',
      unattached: true,
    },
  ],
  poll: {
    options: ['One', 'Two'],
    expires_in: 86_400,
    multiple: false,
  },
  quoted_status_id: null,
  quote_policy: 'followers',
});

const createStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware(defaultMiddleware),
  });

beforeEach(() => {
  clearPersistedComposeDraft(accountOne);
  clearPersistedComposeDraft(accountTwo);
});

describe('BlueLab compose draft persistence', () => {
  test('restores a coherent draft minimized for the same account', () => {
    writePersistedComposeDraft(accountOne, draft());
    const store = createStore();

    const unsubscribe = startComposeDraftPersistence(
      store,
      accountOne,
      'blue-2',
    );

    expect(store.getState().composer.displayState).toBe('minimized');
    expect(store.getState().compose.get('text')).toBe('A persistent draft');
    expect(store.getState().compose.get('spoiler_text')).toBe(
      'Content warning',
    );
    expect(store.getState().compose.get('privacy')).toBe('private');
    expect(store.getState().compose.get('in_reply_to')).toBe('status-1');
    const restoredAttachments = store
      .getState()
      .compose.get('media_attachments') as { size: number };
    const restoredPollOptions = store
      .getState()
      .compose.getIn(['poll', 'options']) as { toJS: () => unknown };

    expect(restoredAttachments.size).toBe(1);
    expect(restoredPollOptions.toJS()).toEqual(['One', 'Two']);

    unsubscribe();
  });

  test('saves changes immediately and removes the draft after reset', () => {
    const store = createStore();
    const unsubscribe = startComposeDraftPersistence(
      store,
      accountOne,
      'blue-2',
    );

    store.dispatch(changeCompose('Saved immediately'));
    expect(readPersistedComposeDraft(accountOne)?.text).toBe(
      'Saved immediately',
    );

    store.dispatch(resetCompose());
    expect(readPersistedComposeDraft(accountOne)).toBeNull();

    unsubscribe();
  });

  test('does not expose a stored draft to another account', () => {
    writePersistedComposeDraft(accountOne, draft('Private to account one'));
    const store = createStore();

    const unsubscribe = startComposeDraftPersistence(
      store,
      accountTwo,
      'blue-2',
    );

    expect(store.getState().composer.displayState).toBe('hidden');
    expect(store.getState().compose.get('text')).toBe('');
    expect(readPersistedComposeDraft(accountOne)?.text).toBe(
      'Private to account one',
    );

    unsubscribe();
  });

  test('does not change the regular Mastodon composer outside BlueLab', () => {
    const store = configureStore({
      reducer: reducerWithInitialState({
        compose: { composer_editor: 'mastodon' },
      }),
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware(defaultMiddleware),
    });
    const unsubscribe = startComposeDraftPersistence(
      store,
      accountOne,
      undefined,
    );

    store.dispatch(changeCompose('Regular Mastodon draft'));

    expect(readPersistedComposeDraft(accountOne)).toBeNull();
    unsubscribe();
  });

  test('removes the persisted draft after a successful publication', () => {
    const store = createStore();
    const unsubscribe = startComposeDraftPersistence(
      store,
      accountOne,
      'blue-2',
    );

    store.dispatch(changeCompose('Publish me'));
    expect(readPersistedComposeDraft(accountOne)).not.toBeNull();

    store.dispatch(submitComposeSuccess({}));
    expect(readPersistedComposeDraft(accountOne)).toBeNull();

    unsubscribe();
  });

  test('removes storage when the user deletes all meaningful content', () => {
    const emptyDraft = draft('');
    emptyDraft.spoiler = false;
    emptyDraft.spoiler_text = '';
    emptyDraft.media_attachments = [];
    emptyDraft.poll = null;
    emptyDraft.in_reply_to = null;

    writePersistedComposeDraft(accountOne, emptyDraft);

    expect(readPersistedComposeDraft(accountOne)).toBeNull();
  });
});
