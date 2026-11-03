import { createSlice, isAction } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { isList } from 'immutable';

import { length } from 'stringz';

import {
  changeCompose,
  changeComposeSpoilerness,
  changeComposeSpoilerText,
  clearComposeSuggestions,
  COMPOSE_SUBMIT_SUCCESS,
  COMPOSE_DIRECT,
  COMPOSE_FOCUS,
  COMPOSE_MENTION,
  COMPOSE_REPLY,
  COMPOSE_SET_STATUS,
  COMPOSE_UPLOAD_REQUEST,
  directCompose,
  resetCompose,
  submitCompose,
} from '@/mastodon/actions/compose';
import {
  changeComposeVisibility,
  PRIVATE_QUOTE_MODAL_ID,
  replyComposeById,
} from '@/mastodon/actions/compose_typed';
import { openModal } from '@/mastodon/actions/modal';
import { REDRAFT } from '@/mastodon/actions/statuses';
import type {
  ApiStatusJSON,
  StatusVisibility,
} from '@/mastodon/api_types/statuses';
import { browserHistory } from '@/mastodon/components/router';
import { countableText } from '@/mastodon/features/compose/util/counter';
import {
  createAppSelector,
  createAppThunk,
} from '@/mastodon/store/typed_functions';

export const COMPOSER_TEXTAREA_ID = 'composer-text';
export function getComposerTextarea() {
  const textarea = document.getElementById(COMPOSER_TEXTAREA_ID);
  if (textarea instanceof HTMLTextAreaElement) {
    return textarea;
  }
  return null;
}

export interface ComposerTextareaSelection {
  start: number;
  end: number;
}

interface PendingFocus {
  selection: ComposerTextareaSelection | null;
}

/**
 * Focuses on the composer textarea.
 * @param defer Waits before focusing. Useful if the composer may not be focusable immediately.
 */
export function focusComposerTextarea(defer = false) {
  const focus = () => {
    const editor = document.querySelector<HTMLElement>(
      '[contenteditable="true"], [contenteditable="plaintext-only"]',
    );
    if (editor) {
      editor.focus();
      return;
    }
    getComposerTextarea()?.focus();
  };
  if (defer) {
    requestAnimationFrame(focus);
  } else {
    focus();
  }
}

type DisplayState = 'hidden' | 'showing' | 'minimized';

export type ComposeType = 'post' | 'message' | 'reply' | 'replyPrivate';

export type ComposerPublishError =
  | 'empty'
  | 'too-long'
  | 'missing-content-warning';

export type ComposerEditor = 'bluelab' | 'mastodon';

export interface ComposerOrigin {
  x: number;
  y: number;
}

interface ComposerState {
  displayState: DisplayState;
  origin: ComposerOrigin | null;
  closeOnSubmitSuccess: boolean;
  pendingFocus: PendingFocus | null;
  publishErrors: ComposerPublishError[];
  initialText: string;
}

const initialState: ComposerState = {
  displayState: 'hidden',
  origin: null,
  closeOnSubmitSuccess: false,
  pendingFocus: null,
  publishErrors: [],
  initialText: '',
};

const composerSlice = createSlice({
  name: 'composer',
  initialState,
  reducers: {
    showComposer(state, action: PayloadAction<ComposerOrigin | undefined>) {
      state.displayState = 'showing';
      state.origin = action.payload ?? null;
      state.closeOnSubmitSuccess = false;
    },
    minimizeComposerToggle(state) {
      state.displayState =
        state.displayState === 'showing' ? 'minimized' : 'showing';
    },
    hideComposer(state) {
      state.displayState = 'hidden';
      state.origin = null;
      state.closeOnSubmitSuccess = false;
      state.pendingFocus = null;
    },
    showRestoredComposer(state) {
      state.displayState = 'minimized';
      state.origin = null;
      state.closeOnSubmitSuccess = false;
    },
    setCloseOnSubmitSuccess(state, action: PayloadAction<boolean>) {
      state.closeOnSubmitSuccess = action.payload;
    },
    requestFocus(
      state,
      action: PayloadAction<ComposerTextareaSelection | undefined>,
    ) {
      state.pendingFocus = { selection: action.payload ?? null };
    },
    clearPendingFocus(state) {
      state.pendingFocus = null;
    },
    addError(state, action: PayloadAction<ComposerPublishError>) {
      if (!state.publishErrors.includes(action.payload)) {
        state.publishErrors.push(action.payload);
      }
      state.pendingFocus = { selection: null };
    },
    clearErrors(
      state,
      action: PayloadAction<ComposerPublishError[] | undefined>,
    ) {
      const errorsToClear = action.payload;
      if (errorsToClear) {
        state.publishErrors = state.publishErrors.filter(
          (existingError) => !errorsToClear.includes(existingError),
        );
      } else {
        state.publishErrors = [];
      }
    },
    setInitialText(
      state,
      action: PayloadAction<
        { text: string } & Partial<ComposerTextareaSelection>
      >,
    ) {
      const { text, start = text.length, end = text.length } = action.payload;
      state.initialText = text;
      state.pendingFocus = { selection: { start, end } };
    },
    reset(state) {
      state.pendingFocus = null;
      state.publishErrors = [];
      state.initialText = '';
    },
  },
  extraReducers: (builder) => {
    builder.addCase(COMPOSE_SUBMIT_SUCCESS, (state) => {
      if (state.closeOnSubmitSuccess) {
        state.displayState = 'hidden';
        state.origin = null;
        state.closeOnSubmitSuccess = false;
      }
    });
    builder.addMatcher(
      (action) =>
        isAction(action) &&
        !(action as { inline?: boolean }).inline &&
        [
          COMPOSE_REPLY,
          COMPOSE_FOCUS,
          COMPOSE_MENTION,
          COMPOSE_DIRECT,
          COMPOSE_SET_STATUS,
          COMPOSE_UPLOAD_REQUEST,
          REDRAFT,
        ].includes(action.type),
      (state) => {
        state.displayState = 'showing';
      },
    );
  },
});

export const composer = composerSlice.reducer;

export const showRestoredComposer = composerSlice.actions.showRestoredComposer;
export const {
  requestFocus: requestComposerFocus,
  clearPendingFocus: clearComposerFocusRequest,
  clearErrors: clearComposerErrors,
} = composerSlice.actions;

export const initializeComposer = createAppThunk(
  (
    arg:
      | { noSelect?: boolean; selectAfterFirstSpace?: boolean }
      | undefined = {},
    { getState, dispatch },
  ) => {
    const text = getState().compose.get('text', '') as string;

    let start = text.length;
    let end = text.length;
    if (arg.noSelect) {
      start = 0;
      end = 0;
    }
    if (arg.selectAfterFirstSpace) {
      start = text.search(/\s/) + 1;
    }

    dispatch(composerSlice.actions.setInitialText({ text, start, end }));
  },
);

export const minimizeComposerToggle = createAppThunk(
  (_arg, { dispatch, getState }) => {
    dispatch(composerSlice.actions.minimizeComposerToggle());

    const displayState = getState().composer.displayState;
    if (displayState !== 'showing') {
      dispatch(clearComposeSuggestions());
    }
  },
);

export const selectComposerIsChanged = createAppSelector(
  [
    (state) => state.compose.get('text') as string,
    (state) => state.compose.get('spoiler_text') as string,
    (state) => !!state.compose.get('poll'),
    (state) => !!state.compose.get('quoted_status_id'),
    (state) =>
      state.compose.get(
        'media_attachments',
      ) as unknown as Immutable.List<unknown>,
    (state) => Number(state.compose.get('pending_media_attachments')),
    (state) =>
      state.compose.get('thread_items') as unknown as Immutable.List<
        Immutable.Map<string, unknown>
      >,
  ],
  (
    text,
    spoilerText,
    hasPoll,
    hasQuote,
    attachments,
    pendingAttachmentsNum,
    threadItems,
  ) =>
    text.trim().length > 0 ||
    spoilerText.trim().length > 0 ||
    hasPoll ||
    hasQuote ||
    attachments.size > 0 ||
    pendingAttachmentsNum > 0 ||
    threadItems.size > 0,
);

interface ComposeNewPost {
  type?: 'post';
}
interface ComposeNewReply {
  type: 'reply';
  toStatusId: string;
}
interface ComposeNewMessage {
  type: 'message';
  toAccountId?: string;
}
export type ComposeNewPayload = (
  | ComposeNewPost
  | ComposeNewReply
  | ComposeNewMessage
) & { force?: boolean; origin?: ComposerOrigin };

export const normalizeComposerEditor = (value: unknown): ComposerEditor =>
  value === 'mastodon' ? 'mastodon' : 'bluelab';

export const selectComposerEditor = createAppSelector(
  [(state) => state.compose.get('composer_editor') as unknown],
  normalizeComposerEditor,
);

export const composerOriginFromElement = (element: Element): ComposerOrigin => {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
};

export const openNewComposer = createAppThunk(
  (payload: ComposeNewPayload | undefined = {}, { dispatch, getState }) => {
    // Always show the composer if it is closed or minimized.
    dispatch(composerSlice.actions.showComposer());

    const isChanged = selectComposerIsChanged(getState());
    if (!payload.force && isChanged) {
      dispatch(
        openModal({
          modalType: 'COMPOSER_DRAFT_DELETE',
          modalProps: {
            openNew: payload,
          },
        }),
      );
      return;
    }

    // Reset but don't hide.
    dispatch(composerSlice.actions.reset());
    dispatch(resetCompose());
    dispatch(clearComposeSuggestions());

    if (payload.type === 'message') {
      const account =
        !!payload.toAccountId && getState().accounts.get(payload.toAccountId);
      if (account) {
        dispatch(directCompose(account));
      } else {
        dispatch(changeComposeVisibility('direct'));
        dispatch(requestComposerFocus());
      }
    } else if (payload.type === 'reply') {
      dispatch(replyComposeById({ statusId: payload.toStatusId }));
    } else {
      dispatch(requestComposerFocus());
    }
    dispatch(composerSlice.actions.showComposer(payload.origin));

    focusComposerTextarea(true);
  },
);

export const openPreferredComposer = createAppThunk(
  (payload: Pick<ComposeNewPayload, 'origin'>, { dispatch, getState }) => {
    const preferredEditor = selectComposerEditor(getState());
    const isVanillaTheme =
      typeof document !== 'undefined' &&
      (!document.body.dataset.theme ||
        document.body.dataset.theme === 'default');

    // Vanilla 5.0 now hosts either editor in its redesigned compose surface.
    // Keep the native editor inside that surface instead of redirecting to the
    // legacy /publish page. Other themes retain their existing route behavior.
    if (preferredEditor === 'mastodon' && !isVanillaTheme) {
      browserHistory.push('/publish', { focusTarget: false });
      return;
    }

    dispatch(openNewComposer({ type: 'post', ...payload }));
  },
);

export const resumeComposer = createAppThunk(
  (origin: ComposerOrigin | undefined, { dispatch }) => {
    dispatch(composerSlice.actions.showComposer(origin));
    focusComposerTextarea(true);
  },
);

export const resetComposer = createAppThunk((_arg, { dispatch }) => {
  dispatch(composerSlice.actions.reset());
  dispatch(composerSlice.actions.hideComposer());
  dispatch(resetCompose());
  dispatch(clearComposeSuggestions());
});

export const closeComposer = createAppThunk((_arg, { getState, dispatch }) => {
  const isChanged = selectComposerIsChanged(getState());

  if (isChanged) {
    dispatch(
      openModal({
        modalType: 'COMPOSER_DRAFT_DELETE',
        modalProps: {},
      }),
    );
  } else {
    dispatch(dismissComposer());
  }
});

export const dismissComposer = createAppThunk((_arg, { dispatch }) => {
  dispatch(composerSlice.actions.hideComposer());
  dispatch(clearComposeSuggestions());
});

export const newComposer = createAppThunk((_arg, { getState, dispatch }) => {
  const isChanged = selectComposerIsChanged(getState());

  if (!isChanged) {
    dispatch(resetComposer());
  } else {
    dispatch(resetComposer());
  }
});

export const selectIsMinimized = createAppSelector(
  [(state) => state.composer.displayState],
  (displayState) => displayState === 'minimized',
);

export const submitComposer = createAppThunk(
  (
    {
      redirectOnSuccess,
      onSuccess,
    }: {
      redirectOnSuccess?: boolean;
      onSuccess?: (status: ApiStatusJSON) => void;
    },
    { getState, dispatch },
  ) => {
    const textareaValue = getComposerTextarea()?.value;
    if (
      textareaValue &&
      (getState().compose.get('text') as string) !== textareaValue
    ) {
      dispatch(changeCompose(textareaValue));
    }

    const { compose, composer, meta, statuses, server, settings } = getState();

    let text = compose.get('text') as string;

    const attachments = compose.get('media_attachments');
    const spoilerText = compose.get('spoiler_text') as string;
    if (
      (!text.trim() || text === composer.initialText) &&
      isList(attachments) &&
      attachments.isEmpty()
    ) {
      dispatch(composerSlice.actions.addError('empty'));
    }

    if (!!compose.get('spoiler') && !spoilerText.trim()) {
      dispatch(composerSlice.actions.addError('missing-content-warning'));
    }

    const maxChars =
      server.server.item?.configuration.statuses.max_characters ?? 500;
    if (compose.get('spoiler') && typeof spoilerText === 'string') {
      text += spoilerText;
    }
    const textLength = length(countableText(text));
    if (textLength > maxChars) {
      dispatch(composerSlice.actions.addError('too-long'));
    }

    // We need to get a fresh state to detect the dispatched errors.
    const {
      composer: { publishErrors },
    } = getState();
    if (publishErrors.length > 0) {
      return;
    }

    const privacy = compose.get('privacy') as StatusVisibility;
    const missingAltText = (
      compose.get('media_attachments') as unknown as Immutable.List<
        Immutable.Map<string, string>
      >
    ).some(
      (media) =>
        ['image', 'gifv'].includes(media.get('type') ?? '') &&
        (media.get('description') ?? '').length === 0,
    );
    const me = meta.get('me') as string | null;
    const quotedStatusId = compose.get('quoted_status_id') as string | null;
    const quoteToPrivate =
      !!quotedStatusId &&
      privacy === 'private' &&
      statuses.getIn([quotedStatusId, 'account']) !== me &&
      !settings.getIn(['dismissed_banners', PRIVATE_QUOTE_MODAL_ID]);
    const closeBlue2AfterSuccess =
      typeof document !== 'undefined' &&
      document.body.dataset.theme === 'blue-2';

    dispatch(
      composerSlice.actions.setCloseOnSubmitSuccess(closeBlue2AfterSuccess),
    );

    if (
      !!meta.get('missing_alt_text_modal') &&
      missingAltText &&
      privacy !== 'direct'
    ) {
      dispatch(
        openModal({
          modalType: 'CONFIRM_MISSING_ALT_TEXT',
          modalProps: {},
        }),
      );
    } else if (quoteToPrivate) {
      dispatch(
        openModal({
          modalType: 'CONFIRM_PRIVATE_QUOTE_NOTIFY',
          modalProps: {},
        }),
      );
    } else {
      dispatch(
        submitCompose((status: ApiStatusJSON) => {
          onSuccess?.(status);

          if (redirectOnSuccess) {
            window.location.assign(status.url);
          }

          dispatch(resetComposer());
        }),
      );
    }
  },
);

export const toggleContentWarning = createAppThunk(
  (_arg, { dispatch, getState }) => {
    dispatch(changeComposeSpoilerText(''));
    dispatch(changeComposeSpoilerness());
    dispatch(clearComposerErrors(['missing-content-warning']));

    if (!getState().compose.get('spoiler')) {
      dispatch(requestComposerFocus());
    }
  },
);
