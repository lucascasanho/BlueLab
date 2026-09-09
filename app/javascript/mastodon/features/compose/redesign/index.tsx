import type React from 'react';
import { useCallback, useEffect, useId, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';

import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';

import { LockSimpleOpenIcon, PepperIcon } from '@phosphor-icons/react';

import {
  changeComposeSpoilerness,
  changeComposeSpoilerText,
  changeComposeThreadItem,
  insertEmojiCompose,
} from '@/mastodon/actions/compose';
import { ToggleButton } from '@/mastodon/components/button/redesign';
import { TextInputField } from '@/mastodon/components/form_fields/redesign';
import { Icon } from '@/mastodon/components/icon';
import {
  focusComposerTextarea,
  submitComposer,
} from '@/mastodon/reducers/slices/composer';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import { ComposeAttachments } from './attachments';
import { ComposeAutocomplete } from './autocomplete';
import type { OnEmojiPick } from './emoji';
import {
  getEditorSelectionOffset,
  getSavedComposerSelectionOffset,
  setSavedComposerSelectionOffset,
} from './emoji_selection';
import { ComposeFooter } from './footer';
import { ComposeFormHeader } from './header';
import { ComposeHints } from './hints';
import { LanguageButton } from './language';
import { ComposeReply } from './reply';
import { RichComposeEditor } from './rich_editor';
import { resolveComposeScrollTarget } from './scroll';
import {
  selectComposeCanSubmit,
  selectComposeSensitive,
  selectComposeType,
} from './selectors';
import classes from './styles.module.scss';
import { ComposeThreadItems } from './thread';
import threadClasses from './thread.module.scss';
import { ComposeThreadFormattingToolbar } from './thread_formatting_toolbar';
import { ComposeVisibility } from './visibility';

const messages = defineMessages({
  sensitiveText: {
    id: 'compose.sensitive.text',
    defaultMessage: 'Sensitive content description',
  },
});

interface RedesignComposeFormProps {
  autoFocus?: boolean;
  className?: string;
  embedded?: boolean;
  noMinimize?: boolean;
  redirectOnSuccess?: boolean;
}

type ThreadItem = ImmutableMap<string, unknown>;

export const RedesignComposeForm: React.FC<
  RedesignComposeFormProps & React.ComponentPropsWithRef<'form'>
> = ({
  autoFocus,
  className,
  embedded = false,
  noMinimize,
  redirectOnSuccess,
  ref,
  ...props
}) => {
  const type = useAppSelector(selectComposeType);
  const rootSensitive = useAppSelector(selectComposeSensitive);
  const threadItems = useAppSelector(
    (state) => state.compose.get('thread_items') as ImmutableList<ThreadItem>,
  );
  const [activeThreadItemId, setActiveThreadItemId] = useState<string | null>(
    null,
  );
  const activeThreadItem = activeThreadItemId
    ? threadItems.find((item) => item.get('id') === activeThreadItemId)
    : undefined;
  const threadMode = !threadItems.isEmpty();
  const sensitive = activeThreadItem
    ? !!activeThreadItem.get('sensitive')
    : rootSensitive.sensitive;
  const sensitiveText = activeThreadItem
    ? ((activeThreadItem.get('spoiler_text') as string | undefined) ?? '')
    : rootSensitive.sensitiveText;

  const { onSensitiveChange, onSensitiveTextChange, onEmojiPick, onSubmit } =
    useComposeHandlers(redirectOnSuccess, activeThreadItemId);

  const intl = useIntl();
  const titleId = useId();

  const handleWheelCapture: React.WheelEventHandler<HTMLFormElement> =
    useCallback((event) => {
      const target = resolveComposeScrollTarget(event.target);
      if (!target || target.zone === 'body') return;

      const { element } = target;
      const maxScrollTop = Math.max(
        element.scrollHeight - element.clientHeight,
        0,
      );
      if (maxScrollTop === 0) return;

      const nextScrollTop = Math.min(
        maxScrollTop,
        Math.max(0, element.scrollTop + event.deltaY),
      );

      if (nextScrollTop === element.scrollTop) return;

      event.preventDefault();
      element.scrollTop = nextScrollTop;
    }, []);

  const handlePrimaryEditorFocus = useCallback(() => {
    setActiveThreadItemId(null);
  }, []);

  const mainEditor = (
    <ComposeAutocomplete>
      <RichComposeEditor
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        onSubmit={onSubmit}
      >
        <ComposeAttachments className={classes.attachments} />
      </RichComposeEditor>
    </ComposeAutocomplete>
  );

  return (
    <form
      {...props}
      ref={ref}
      role={embedded ? 'region' : 'dialog'}
      data-bluelab-composer
      data-bluelab-composer-embedded={embedded ? 'true' : undefined}
      onSubmit={onSubmit}
      onWheelCapture={handleWheelCapture}
      aria-labelledby={titleId}
      className={classNames(className, classes.root)}
    >
      {(type === 'message' || type === 'replyPrivate') && (
        <div className={classes.background} />
      )}

      <ComposeFormHeader
        id={titleId}
        noMinimize={noMinimize || embedded}
        noClose={embedded}
      />

      <div
        className={classes.content}
        data-compose-scroll-container
        data-compose-scroll-zone='panel'
      >
        <ComposeReply />

        <div className={classes.toolbar} data-bluelab-compose-toolbar>
          <ComposeVisibility
            className={classes.flexGrowWrap}
            activeThreadItemId={activeThreadItemId}
          />

          <LanguageButton activeThreadItemId={activeThreadItemId} />

          <ToggleButton
            size='sm'
            active={sensitive}
            onClick={onSensitiveChange}
            leadingIcon={PepperIcon}
          >
            <FormattedMessage
              id='compose.sensitive'
              defaultMessage='Sensitive'
            />
          </ToggleButton>
        </div>

        {type === 'message' && (
          <p className={classes.toolbarMessage}>
            <Icon id='lock-open' icon={LockSimpleOpenIcon} />
            <FormattedMessage
              id='compose.message.notice'
              defaultMessage='Messages are not end-to-end encrypted'
              description='Message refers to a direct message. For languages where this is confusing, "chat" or "direct message" can be used.'
            />
          </p>
        )}

        {sensitive && (
          <TextInputField
            label={intl.formatMessage(messages.sensitiveText)}
            value={sensitiveText}
            onChange={onSensitiveTextChange}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- Focuses on open
            autoFocus
          />
        )}

        {threadMode && (
          <ComposeThreadFormattingToolbar
            activeThreadItemId={activeThreadItemId}
          />
        )}

        {threadMode ? (
          <div className={threadClasses.threadEditorScope}>
            <div
              className={threadClasses.primaryPost}
              data-compose-thread-main
              onFocusCapture={handlePrimaryEditorFocus}
            >
              {mainEditor}
            </div>
            <ComposeThreadItems
              activeItemId={activeThreadItemId}
              onFocusItem={setActiveThreadItemId}
              onSubmit={onSubmit}
            />
          </div>
        ) : (
          mainEditor
        )}

        <ThreadFailure />

        <ComposeHints />
      </div>

      <ComposeFooter
        onEmojiPick={onEmojiPick}
        activeThreadItemId={activeThreadItemId}
      />
    </form>
  );
};

const ThreadFailure: React.FC = () => {
  const index = useAppSelector(
    (state) => state.compose.get('thread_error_index') as number | null,
  );
  if (index === null) return null;

  return (
    <p role='alert' className={classes.threadFailure}>
      <FormattedMessage
        id='compose.thread.failure_inline'
        defaultMessage='Publication stopped at post {index}. Posts already published were kept. Press Publish again to retry safely from this point.'
        values={{ index: index + 1 }}
      />
    </p>
  );
};

const allowedAroundShortCode =
  '><\u0085\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029\u0009\u000a\u000b\u000c\u000d';

function useComposeHandlers(
  redirectOnSuccess?: boolean,
  activeThreadItemId: string | null = null,
) {
  const text = useAppSelector((state) => state.compose.get('text') as string);
  const activeThreadItem = useAppSelector((state) => {
    if (!activeThreadItemId) return null;
    return (
      (state.compose.get('thread_items') as ImmutableList<ThreadItem>).find(
        (item) => item.get('id') === activeThreadItemId,
      ) ?? null
    );
  });
  const targetText = activeThreadItem
    ? ((activeThreadItem.get('text') as string | undefined) ?? '')
    : text;

  const dispatch = useAppDispatch();

  // Sensitive / CW handling follows the post that currently owns focus.
  const rootSensitive = useAppSelector(
    (state) => !!state.compose.get('spoiler'),
  );
  const isSensitive = activeThreadItem
    ? !!activeThreadItem.get('sensitive')
    : rootSensitive;
  useEffect(() => {
    if (!isSensitive && !activeThreadItemId) {
      focusComposerTextarea();
    }
  }, [activeThreadItemId, isSensitive]);

  const onSensitiveChange = useCallback(() => {
    if (activeThreadItemId) {
      const nextSensitive = !isSensitive;
      dispatch(
        changeComposeThreadItem(activeThreadItemId, 'sensitive', nextSensitive),
      );
      if (!nextSensitive) {
        dispatch(
          changeComposeThreadItem(activeThreadItemId, 'spoiler_text', ''),
        );
      }
    } else {
      dispatch(changeComposeSpoilerness());
    }
  }, [activeThreadItemId, dispatch, isSensitive]);
  const onSensitiveTextChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        if (activeThreadItemId) {
          dispatch(
            changeComposeThreadItem(
              activeThreadItemId,
              'spoiler_text',
              event.target.value,
            ),
          );
        } else {
          dispatch(changeComposeSpoilerText(event.target.value));
        }
      },
      [activeThreadItemId, dispatch],
    );

  const onEmojiPick: OnEmojiPick = useCallback(
    (emoji) => {
      const threadEditor = activeThreadItemId
        ? document.querySelector<HTMLElement>(
            `[data-thread-item-id="${activeThreadItemId}"] [data-compose-scroll-zone='editor']`,
          )
        : null;
      const editor =
        threadEditor ??
        document.querySelector<HTMLElement>(
          "[data-bluelab-composer] [data-compose-scroll-zone='editor']",
        );
      const activeElement = document.activeElement;
      const selection = window.getSelection();
      const hasLiveEditorSelection =
        !!editor &&
        activeElement === editor &&
        !!selection?.rangeCount &&
        !!selection.anchorNode &&
        editor.contains(selection.anchorNode);
      const liveSelectionStart = hasLiveEditorSelection
        ? getEditorSelectionOffset(editor)
        : null;
      const rawSelectionStart =
        liveSelectionStart ?? getSavedComposerSelectionOffset();
      const selectionStart = Math.min(
        targetText.length,
        Math.max(0, rawSelectionStart),
      );

      const beforePosition = targetText[selectionStart - 1];
      const needsSpace =
        'custom' in emoji &&
        !!emoji.custom &&
        !!beforePosition &&
        !allowedAroundShortCode.includes(beforePosition);
      const emojiText =
        'native' in emoji && emoji.native ? emoji.native : `:${emoji.id}:`;
      const insertedLength = emojiText.length + (needsSpace ? 1 : 0) + 1;

      if (activeThreadItemId) {
        const insertion = `${needsSpace ? ' ' : ''}${emojiText} `;
        dispatch(
          changeComposeThreadItem(
            activeThreadItemId,
            'text',
            `${targetText.slice(0, selectionStart)}${insertion}${targetText.slice(selectionStart)}`,
          ),
        );
      } else {
        dispatch(insertEmojiCompose(selectionStart, emoji, needsSpace));
      }

      setSavedComposerSelectionOffset(selectionStart + insertedLength);
    },
    [activeThreadItemId, dispatch, targetText],
  );

  // Submit status
  const canSubmit = useAppSelector(selectComposeCanSubmit);
  const onSubmit = useCallback(
    (event?: React.SubmitEvent) => {
      if (!canSubmit || event?.defaultPrevented) {
        return;
      }
      dispatch(
        submitComposer({
          redirectOnSuccess,
        }),
      );

      if (event) {
        event.preventDefault();
      }
    },
    [canSubmit, dispatch, redirectOnSuccess],
  );

  return {
    onSubmit,
    onEmojiPick,
    onSensitiveChange,
    onSensitiveTextChange,
  };
}
