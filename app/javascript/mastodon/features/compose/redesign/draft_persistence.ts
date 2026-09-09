import type { Store } from '@reduxjs/toolkit';

import { restoreComposeDraft } from '@/mastodon/actions/compose_draft';
import type { PersistedComposeDraft } from '@/mastodon/actions/compose_draft';
import type { StatusVisibility } from '@/mastodon/api_types/statuses';
import { me } from '@/mastodon/initial_state';
import { showRestoredComposer } from '@/mastodon/reducers/slices/composer';
import { Settings } from '@/mastodon/settings';
import type { RootState } from '@/mastodon/store';

const STORAGE_VERSION = 3;

interface StoredComposeDraft {
  version: typeof STORAGE_VERSION;
  draft: PersistedComposeDraft;
}

const composeDraftSettings = new Settings<Record<string, StoredComposeDraft>>(
  'mastodon_bluelab_compose_draft',
);

const statusVisibilities: StatusVisibility[] = [
  'public',
  'unlisted',
  'private',
  'direct',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nullableString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const stringOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const booleanOr = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const nullableIndex = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;

const visibilityOrNull = (value: unknown): StatusVisibility | null =>
  statusVisibilities.includes(value as StatusVisibility)
    ? (value as StatusVisibility)
    : null;

const sanitizeAttachments = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (attachment): attachment is Record<string, unknown> =>
        isRecord(attachment) && typeof attachment.id === 'string',
    )
    .map(({ file: _file, ...attachment }) => {
      return attachment;
    });
};

const normalizePoll = (value: unknown): Record<string, unknown> | null => {
  if (!isRecord(value) || !Array.isArray(value.options)) return null;

  const options = value.options.filter(
    (option): option is string => typeof option === 'string',
  );
  if (options.length < 2) return null;

  return {
    options,
    expires_in:
      typeof value.expires_in === 'number' ? value.expires_in : 86_400,
    multiple: booleanOr(value.multiple, false),
  };
};

const sanitizeThreadItems = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((item) => ({
    id: stringOr(item.id, crypto.randomUUID()),
    text: stringOr(item.text, ''),
    spoiler_text: stringOr(item.spoiler_text, ''),
    sensitive: booleanOr(item.sensitive, false),
    visibility: visibilityOrNull(item.visibility) ?? 'public',
    language: stringOr(item.language, 'en'),
    content_type: stringOr(item.content_type, 'text/markdown'),
    media_attachments: sanitizeAttachments(item.media_attachments),
    idempotencyKey: stringOr(item.idempotencyKey, crypto.randomUUID()),
  }));
};

const normalizePublishedIds = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
};

const normalizeDraft = (value: unknown): PersistedComposeDraft | null => {
  if (!isRecord(value)) return null;

  return {
    id: nullableString(value.id),
    text: stringOr(value.text, ''),
    content_type: stringOr(value.content_type, 'text/markdown'),
    spoiler: booleanOr(value.spoiler, false),
    spoiler_text: stringOr(value.spoiler_text, ''),
    in_reply_to: nullableString(value.in_reply_to),
    privacy: visibilityOrNull(value.privacy),
    sensitive: booleanOr(value.sensitive, false),
    language: stringOr(value.language, 'en'),
    media_attachments: sanitizeAttachments(value.media_attachments),
    poll: normalizePoll(value.poll),
    quoted_status_id: nullableString(value.quoted_status_id),
    quote_policy: stringOr(value.quote_policy, 'public'),
    scheduled_at: nullableString(value.scheduled_at),
    scheduled_timezone: nullableString(value.scheduled_timezone),
    idempotency_key: stringOr(value.idempotency_key, crypto.randomUUID()),
    thread_items: sanitizeThreadItems(value.thread_items),
    thread_published_ids: normalizePublishedIds(value.thread_published_ids),
    thread_error_index: nullableIndex(value.thread_error_index),
  };
};

export const composeDraftHasContent = (draft: PersistedComposeDraft) =>
  draft.text.trim().length > 0 ||
  draft.spoiler_text.trim().length > 0 ||
  draft.media_attachments.length > 0 ||
  draft.poll !== null ||
  draft.quoted_status_id !== null ||
  draft.thread_items.length > 0;

export const serializeComposeDraft = (
  state: RootState,
): PersistedComposeDraft => {
  const compose = state.compose;
  const attachments = compose.get('media_attachments') as
    | { toJS: () => unknown }
    | undefined;
  const poll = compose.get('poll') as { toJS: () => unknown } | null;
  const threadItems = compose.get('thread_items') as
    | { toJS: () => unknown }
    | undefined;
  const publishedIds = compose.get('thread_published_ids') as
    | { toJS: () => unknown }
    | undefined;

  return {
    id: nullableString(compose.get('id')),
    text: stringOr(compose.get('text'), ''),
    content_type: stringOr(compose.get('content_type'), 'text/markdown'),
    spoiler: booleanOr(compose.get('spoiler'), false),
    spoiler_text: stringOr(compose.get('spoiler_text'), ''),
    in_reply_to: nullableString(compose.get('in_reply_to')),
    privacy: visibilityOrNull(compose.get('privacy')),
    sensitive: booleanOr(compose.get('sensitive'), false),
    language: stringOr(compose.get('language'), 'en'),
    media_attachments: sanitizeAttachments(attachments?.toJS()),
    poll: normalizePoll(poll?.toJS()),
    quoted_status_id: nullableString(compose.get('quoted_status_id')),
    quote_policy: stringOr(compose.get('quote_policy'), 'public'),
    scheduled_at: nullableString(compose.get('scheduled_at')),
    scheduled_timezone: nullableString(compose.get('scheduled_timezone')),
    idempotency_key: stringOr(
      compose.get('idempotencyKey'),
      crypto.randomUUID(),
    ),
    thread_items: sanitizeThreadItems(threadItems?.toJS()),
    thread_published_ids: normalizePublishedIds(publishedIds?.toJS()),
    thread_error_index: nullableIndex(compose.get('thread_error_index')),
  };
};

export const readPersistedComposeDraft = (
  accountId: string,
): PersistedComposeDraft | null => {
  const stored = composeDraftSettings.get(accountId);
  if (stored?.version !== STORAGE_VERSION) return null;

  const draft = normalizeDraft(stored.draft);
  return draft && composeDraftHasContent(draft) ? draft : null;
};

export const writePersistedComposeDraft = (
  accountId: string,
  draft: PersistedComposeDraft,
) => {
  if (composeDraftHasContent(draft)) {
    composeDraftSettings.set(accountId, {
      version: STORAGE_VERSION,
      draft,
    });
  } else {
    composeDraftSettings.remove(accountId);
  }
};

export const clearPersistedComposeDraft = (accountId: string) => {
  composeDraftSettings.remove(accountId);
};

const blueLabComposerIsActive = (state: RootState, theme: string | undefined) =>
  theme === 'blue-2' || state.compose.get('composer_editor') === 'bluelab';

export const startComposeDraftPersistence = (
  store: Pick<Store<RootState>, 'dispatch' | 'getState' | 'subscribe'>,
  accountId = me,
  theme = typeof document === 'undefined'
    ? undefined
    : document.body.dataset.theme,
) => {
  if (!accountId || !blueLabComposerIsActive(store.getState(), theme)) {
    return () => undefined;
  }

  const restoredDraft = readPersistedComposeDraft(accountId);
  if (restoredDraft) {
    store.dispatch(restoreComposeDraft(restoredDraft));
    store.dispatch(showRestoredComposer());
  }

  let previousCompose = store.getState().compose;

  return store.subscribe(() => {
    const state = store.getState();
    if (state.compose === previousCompose) return;

    previousCompose = state.compose;
    writePersistedComposeDraft(accountId, serializeComposeDraft(state));
  });
};
