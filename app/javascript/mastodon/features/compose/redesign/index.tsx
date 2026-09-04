import type React from 'react';
import { useCallback, useEffect, useId } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';

import { LockSimpleOpenIcon, PepperIcon } from '@phosphor-icons/react';

import {
  changeCompose,
  changeComposeSpoilerness,
  changeComposeSpoilerText,
  insertEmojiCompose,
} from '@/mastodon/actions/compose';
import { ToggleButton } from '@/mastodon/components/button/redesign';
import { TextInputField } from '@/mastodon/components/form_fields/redesign';
import { Icon } from '@/mastodon/components/icon';
import {
  focusComposerTextarea,
  getComposerTextarea,
  submitComposer,
} from '@/mastodon/reducers/slices/composer';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import { ComposeAttachments } from './attachments';
import { ComposeAutocomplete } from './autocomplete';
import type { OnEmojiPick } from './emoji';
import { ComposeFooter } from './footer';
import { ComposeFormHeader } from './header';
import { ComposeHints } from './hints';
import { LanguageButton } from './language';
import { ComposeReply } from './reply';
import {
  captureComposerSelectionOffset,
  editorText,
  getEditorSelectionOffset,
  getSavedComposerSelectionOffset,
  RichComposeEditor,
  setSavedComposerSelectionOffset,
} from './rich_editor';
import { resolveComposeScrollTarget } from './scroll';
import {
  selectComposeCanSubmit,
  selectComposeSensitive,
  selectComposeType,
} from './selectors';
import classes from './styles.module.scss';
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
  const { sensitive, sensitiveText } = useAppSelector(selectComposeSensitive);

  const { onSensitiveChange, onSensitiveTextChange, onEmojiPick, onSubmit } =
    useComposeHandlers(redirectOnSuccess);

  const intl = useIntl();
  const titleId = useId();

  const handleWheelCapture: React.WheelEventHandler<HTMLFormElement> =
    useCallback((event) => {
      const target = resolveComposeScrollTarget(event.target);
      if (!target || target.zone === 'body') return;

      const { element } = target;
      const nextScrollTop = element.scrollTop + event.deltaY;
      const maxScrollTop = Math.max(
        element.scrollHeight - element.clientHeight,
        0,
      );

      if (nextScrollTop < 0 || nextScrollTop > maxScrollTop) {
        return;
      }

      event.preventDefault();
      element.scrollTop = nextScrollTop;
    }, []);

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
      {type === 'message' && <div className={classes.background} />}

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
          <ComposeVisibility className={classes.flexGrowWrap} />

          <LanguageButton />

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

        <ComposeAutocomplete>
          <RichComposeEditor
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus={autoFocus}
            onSubmit={onSubmit}
          >
            <ComposeAttachments className={classes.attachments} />
          </RichComposeEditor>
        </ComposeAutocomplete>

        <ComposeHints />
      </div>

      <ComposeFooter onEmojiPick={onEmojiPick} />
    </form>
  );
};

const allowedAroundShortCode =
  '><\u0085\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029\u0009\u000a\u000b\u000c\u000d';

function useComposeHandlers(redirectOnSuccess?: boolean) {
  const text = useAppSelector((state) => state.compose.get('text') as string);

  const dispatch = useAppDispatch();

  // Sensitive handling
  const isSensitive = useAppSelector((state) => !!state.compose.get('spoiler'));
  useEffect(() => {
    if (!isSensitive) {
      focusComposerTextarea();
    }
  }, [isSensitive]);

  const onSensitiveChange = useCallback(() => {
    dispatch(changeComposeSpoilerness());
  }, [dispatch]);
  const onSensitiveTextChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        dispatch(changeComposeSpoilerText(event.target.value));
      },
      [dispatch],
    );

  const onEmojiPick: OnEmojiPick = useCallback(
    (emoji) => {
      captureComposerSelectionOffset();

      const activeElement = document.activeElement;
      const editor =
        activeElement instanceof HTMLElement ? activeElement : null;
      const composerTextArea = getComposerTextarea();
      const isContentEditable =
        !!editor &&
        (editor.isContentEditable ||
          editor.contentEditable === 'true' ||
          editor.contentEditable === 'plaintext-only' ||
          editor.getAttribute('contenteditable') === 'true' ||
          editor.getAttribute('contenteditable') === 'plaintext-only');
      const savedSelectionStart = getSavedComposerSelectionOffset();

      const selectionFromEditor = (() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;

        const range = selection.getRangeAt(0);
        let container: Node | null =
          range.startContainer instanceof Element
            ? range.startContainer
            : range.startContainer.parentElement;

        while (container) {
          if (
            container instanceof HTMLElement &&
            (container.isContentEditable ||
              container.contentEditable === 'true' ||
              container.contentEditable === 'plaintext-only' ||
              container.getAttribute('contenteditable') === 'true' ||
              container.getAttribute('contenteditable') === 'plaintext-only')
          ) {
            return getEditorSelectionOffset(container);
          }
          container = container.parentNode;
        }

        return null;
      })();

      const selectionStart =
        composerTextArea && activeElement === composerTextArea
          ? composerTextArea.selectionStart || 0
          : (selectionFromEditor ?? savedSelectionStart);

      const beforePosition = text[selectionStart - 1];
      const needsSpace =
        'custom' in emoji &&
        !!emoji.custom &&
        !!beforePosition &&
        !allowedAroundShortCode.includes(beforePosition);

      if (editor && isContentEditable) {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          let currentOffset = 0;
          const walker = document.createTreeWalker(
            editor,
            NodeFilter.SHOW_TEXT,
          );
          let node: Node | null = walker.nextNode();

          while (node) {
            const length = node.textContent?.length ?? 0;
            if (currentOffset + length >= selectionStart) {
              range.setStart(node, selectionStart - currentOffset);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              break;
            }
            currentOffset += length;
            node = walker.nextNode();
          }

          if (!selection.rangeCount) {
            range.selectNodeContents(editor);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }

          const caretRange = selection.getRangeAt(0).cloneRange();
          caretRange.deleteContents();
          const inserted = document.createTextNode(
            'native' in emoji && emoji.native ? emoji.native : `:${emoji.id}:`,
          );
          caretRange.insertNode(inserted);
          caretRange.setStartAfter(inserted);
          caretRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(caretRange);
          captureComposerSelectionOffset();
          dispatch(changeCompose(editorText(editor)));
          return;
        }
      }

      const emojiText =
        'native' in emoji && emoji.native ? emoji.native : `:${emoji.id}:`;
      const insertedLength = emojiText.length + (needsSpace ? 1 : 0) + 1;

      dispatch(insertEmojiCompose(selectionStart, emoji, needsSpace));
      setSavedComposerSelectionOffset(selectionStart + insertedLength);
    },
    [dispatch, text],
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
