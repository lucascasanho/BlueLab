import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import {
  CodeBlockIcon,
  CodeIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
} from '@phosphor-icons/react';

import {
  changeCompose,
  changeComposeContentType,
  changeComposeThreadItem,
} from '@/mastodon/actions/compose';
import { IconButton } from '@/mastodon/components/button/redesign';
import type { IconProp } from '@/mastodon/components/icon';
import { useAppDispatch } from '@/mastodon/store';

import {
  editorText,
  toggleInlineCommand,
} from './rich_editor';
import classes from './thread.module.scss';

const messages = defineMessages({
  toolbar: {
    id: 'compose.formatting.toolbar',
    defaultMessage: 'Formatting',
  },
  bold: {
    id: 'compose.formatting.bold',
    defaultMessage: 'Bold',
  },
  italic: {
    id: 'compose.formatting.italic',
    defaultMessage: 'Italic',
  },
  underline: {
    id: 'compose.formatting.underline',
    defaultMessage: 'Underline',
  },
  strikethrough: {
    id: 'compose.formatting.strikethrough',
    defaultMessage: 'Strikethrough',
  },
  quote: {
    id: 'compose.formatting.quote',
    defaultMessage: 'Quote',
  },
  bulletedList: {
    id: 'compose.formatting.bulleted_list',
    defaultMessage: 'Bulleted list',
  },
  numberedList: {
    id: 'compose.formatting.numbered_list',
    defaultMessage: 'Numbered list',
  },
  inlineCode: {
    id: 'compose.formatting.inline_code',
    defaultMessage: 'Inline code',
  },
  codeBlock: {
    id: 'compose.formatting.code_block',
    defaultMessage: 'Code block',
  },
  link: {
    id: 'compose.formatting.link',
    defaultMessage: 'Link',
  },
  linkUrl: {
    id: 'compose.formatting.link_url',
    defaultMessage: 'Link URL',
  },
});

const commands = [
  ['bold', TextBIcon, messages.bold],
  ['italic', TextItalicIcon, messages.italic],
  ['underline', TextUnderlineIcon, messages.underline],
  ['strikeThrough', TextStrikethroughIcon, messages.strikethrough],
  ['formatBlock', QuotesIcon, messages.quote, 'blockquote'],
  ['insertUnorderedList', ListBulletsIcon, messages.bulletedList],
  ['insertOrderedList', ListNumbersIcon, messages.numberedList],
  ['code', CodeIcon, messages.inlineCode],
  ['formatBlock', CodeBlockIcon, messages.codeBlock, 'pre'],
] as const;

type InlineCommand = 'bold' | 'italic' | 'underline' | 'strikeThrough';

const inlineCommands: readonly InlineCommand[] = [
  'bold',
  'italic',
  'underline',
  'strikeThrough',
];

const selectionElement = () => {
  const node = window.getSelection()?.anchorNode;
  if (!node) return null;
  return node instanceof HTMLElement ? node : node.parentElement;
};

const closestWithin = (
  element: HTMLElement | null,
  selector: string,
  editor: HTMLElement,
) => {
  const match = element?.closest<HTMLElement>(selector) ?? null;
  return match && editor.contains(match) ? match : null;
};

const unwrapElement = (element: HTMLElement) => {
  const parent = element.parentNode;
  if (!parent) return;
  const first = element.firstChild;
  const last = element.lastChild;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  element.remove();
  if (!first || !last) return;
  const range = document.createRange();
  range.setStartBefore(first);
  range.setEndAfter(last);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};

const wrapSelection = (tagName: string) => {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return;
  const wrapper = document.createElement(tagName);
  try {
    range.surroundContents(wrapper);
  } catch {
    wrapper.append(range.extractContents());
    range.insertNode(wrapper);
  }
  selection.removeAllRanges();
  const nextRange = document.createRange();
  nextRange.selectNodeContents(wrapper);
  selection.addRange(nextRange);
};

const focusAtEnd = (editor: HTMLElement) => {
  editor.focus({ preventScroll: true });
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

export const ComposeThreadFormattingToolbar: React.FC<{
  activeThreadItemId: string | null;
}> = ({ activeThreadItemId }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const selectionRef = useRef<Range | null>(null);
  const [activeFormats, setActiveFormats] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const getTargetEditor = useCallback(() => {
    if (activeThreadItemId) {
      return document.querySelector<HTMLElement>(
        `[data-thread-item-id="${activeThreadItemId}"] [data-compose-scroll-zone='editor']`,
      );
    }

    return document.querySelector<HTMLElement>(
      `[data-compose-thread-main] [data-compose-scroll-zone='editor']`,
    );
  }, [activeThreadItemId]);

  const updateActiveFormats = useCallback(() => {
    const editor = getTargetEditor();
    const selection = window.getSelection();
    if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) {
      setActiveFormats(new Set());
      return;
    }

    const active = new Set<string>();
    for (const command of [
      'bold',
      'italic',
      'underline',
      'strikeThrough',
      'insertUnorderedList',
      'insertOrderedList',
    ]) {
      // execCommand state is still the interoperable browser editing state for contentEditable.
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      if (document.queryCommandState(command)) active.add(command);
    }

    const element = selectionElement();
    if (closestWithin(element, 'code', editor)) active.add('code');
    if (closestWithin(element, 'pre', editor)) active.add('pre');
    if (closestWithin(element, 'blockquote', editor)) active.add('blockquote');
    if (closestWithin(element, 'a', editor)) active.add('link');
    setActiveFormats(active);
  }, [getTargetEditor]);

  useEffect(() => {
    selectionRef.current = null;
    updateActiveFormats();
  }, [activeThreadItemId, updateActiveFormats]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => {
      document.removeEventListener('selectionchange', updateActiveFormats);
    };
  }, [updateActiveFormats]);

  const captureSelection: React.MouseEventHandler = useCallback(
    (event) => {
      event.preventDefault();
      const editor = getTargetEditor();
      const selection = window.getSelection();
      if (
        editor &&
        selection?.rangeCount &&
        selection.anchorNode &&
        editor.contains(selection.anchorNode)
      ) {
        selectionRef.current = selection.getRangeAt(0).cloneRange();
      }
    },
    [getTargetEditor],
  );

  const restoreSelection = useCallback(
    (editor: HTMLElement) => {
      const selection = window.getSelection();
      const saved = selectionRef.current;
      if (selection && saved && editor.contains(saved.commonAncestorContainer)) {
        editor.focus({ preventScroll: true });
        selection.removeAllRanges();
        selection.addRange(saved);
        return;
      }

      focusAtEnd(editor);
    },
    [],
  );

  const syncEditor = useCallback(
    (editor: HTMLElement) => {
      const value = editorText(editor);
      if (activeThreadItemId) {
        dispatch(
          changeComposeThreadItem(
            activeThreadItemId,
            'content_type',
            'text/markdown',
          ),
        );
        dispatch(changeComposeThreadItem(activeThreadItemId, 'text', value));
      } else {
        dispatch(changeComposeContentType('text/markdown'));
        dispatch(changeCompose(value));
      }
    },
    [activeThreadItemId, dispatch],
  );

  const handleCommand: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      const editor = getTargetEditor();
      if (!editor) return;

      restoreSelection(editor);
      const button = event.currentTarget;
      const command = button.dataset.command ?? 'bold';

      if (inlineCommands.includes(command as InlineCommand)) {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand('styleWithCSS', false, 'false');
        toggleInlineCommand(command as InlineCommand);
      } else if (command === 'formatBlock' && button.dataset.value) {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand(
          'formatBlock',
          false,
          activeFormats.has(button.dataset.value) ? 'div' : button.dataset.value,
        );
      } else if (command === 'code') {
        const code = closestWithin(selectionElement(), 'code', editor);
        if (code) unwrapElement(code);
        else wrapSelection('code');
      } else {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand(command, false, button.dataset.value);
      }

      syncEditor(editor);
      updateActiveFormats();
    },
    [activeFormats, getTargetEditor, restoreSelection, syncEditor, updateActiveFormats],
  );

  const handleLink: React.MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    const editor = getTargetEditor();
    if (!editor) return;

    restoreSelection(editor);
    const link = closestWithin(selectionElement(), 'a', editor);
    if (link) {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand('unlink');
      syncEditor(editor);
      updateActiveFormats();
      return;
    }

    const url = window.prompt(intl.formatMessage(messages.linkUrl));
    if (!url) return;

    restoreSelection(editor);
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand('createLink', false, url);
    syncEditor(editor);
    updateActiveFormats();
  }, [getTargetEditor, intl, restoreSelection, syncEditor, updateActiveFormats]);

  return (
    <div
      className={classes.formattingToolbar}
      role='toolbar'
      aria-label={intl.formatMessage(messages.toolbar)}
      data-thread-formatting-toolbar
    >
      {commands.map(([command, icon, message, value]) => {
        const stateKey = value ?? command;
        const active = activeFormats.has(stateKey);
        const label = intl.formatMessage(message);
        return (
          <IconButton
            key={`${command}-${value ?? 'default'}`}
            as='button'
            type='button'
            size='sm'
            icon={icon as IconProp}
            title={label}
            data-command={command}
            data-value={value}
            color={active ? 'accent' : 'neutral'}
            aria-pressed={active}
            onMouseDown={captureSelection}
            onClick={handleCommand}
          >
            {label}
          </IconButton>
        );
      })}
      <IconButton
        as='button'
        type='button'
        size='sm'
        icon={LinkIcon}
        title={intl.formatMessage(messages.link)}
        color={activeFormats.has('link') ? 'accent' : 'neutral'}
        aria-pressed={activeFormats.has('link')}
        onMouseDown={captureSelection}
        onClick={handleLink}
      >
        {intl.formatMessage(messages.link)}
      </IconButton>
    </div>
  );
};
