import type { Store } from '@reduxjs/toolkit';

import { restoreComposeDraft } from '@/mastodon/actions/compose_draft';
import type { PersistedComposeDraft } from '@/mastodon/actions/compose_draft';
import type { StatusVisibility } from '@/mastodon/api_types/statuses';
import { me } from '@/mastodon/initial_state';
import { showRestoredComposer } from '@/mastodon/reducers/slices/composer';
import { Settings } from '@/mastodon/settings';
import type { RootState } from '@/mastodon/store';

const STORAGE_VERSION = 1;

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
  };
};

export const composeDraftHasContent = (draft: PersistedComposeDraft) =>
  draft.text.trim().length > 0 ||
  draft.spoiler_text.trim().length > 0 ||
  draft.media_attachments.length > 0 ||
  draft.poll !== null ||
  draft.quoted_status_id !== null;

export const serializeComposeDraft = (
  state: RootState,
): PersistedComposeDraft => {
  const compose = state.compose;
  const attachments = compose.get('media_attachments') as
    | { toJS: () => unknown }
    | undefined;
  const poll = compose.get('poll') as { toJS: () => unknown } | null;

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
