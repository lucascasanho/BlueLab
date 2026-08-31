/* eslint-disable react/jsx-no-bind -- editor handlers are stable closures required by contentEditable. */
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import {
  TextBIcon,
  CodeIcon,
  CodeBlockIcon,
  TextItalicIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  TextStrikethroughIcon,
} from '@phosphor-icons/react';

import {
  changeCompose,
  changeComposeContentType,
} from '@/mastodon/actions/compose';
import { processPasteOrDrop } from '@/mastodon/actions/compose_typed';
import { IconButton } from '@/mastodon/components/button/redesign';
import { normalizeKey } from '@/mastodon/components/hotkeys/utils';
import type { IconProp } from '@/mastodon/components/icon';
import { useCustomEmojis } from '@/mastodon/hooks/useCustomEmojis';
import {
  COMPOSER_TEXTAREA_ID,
  dismissComposer,
} from '@/mastodon/reducers/slices/composer';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import classes from './styles.module.scss';

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

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttribute = (value: string) =>
  escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const inlineMarkdownToHtml = (
  value: string,
  customEmojis: Record<string, { static_url: string; url: string }>,
) => {
  const emojiPlaceholders: string[] = [];
  return escapeHtml(value)
    .replace(/:([a-zA-Z0-9_+-]+):/g, (match, shortcode: string) => {
      const emoji = customEmojis[shortcode];
      if (!emoji) return match;
      const index = emojiPlaceholders.push(match) - 1;
      return `BLUELABEMOJI${index}TOKEN`;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/BLUELABEMOJI(\d+)TOKEN/g, (_placeholder, index: string) => {
      const shortcode = emojiPlaceholders[Number(index)] ?? '';
      const emoji = customEmojis[shortcode.slice(1, -1)];
      if (!emoji) return shortcode;
      return `<span data-emoji-shortcode="${escapeAttribute(shortcode)}" contenteditable="false"><img src="${escapeAttribute(emoji.url)}" alt="${escapeAttribute(shortcode)}" draggable="false" /></span>`;
    });
};

export const markdownToHtml = (
  value: string,
  customEmojis: Record<string, { static_url: string; url: string }>,
) => {
  const lines = value.split('\n');
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.trim() === '```') {
      const code: string[] = [];
      while (++index < lines.length && lines[index]?.trim() !== '```') {
        code.push(lines[index] ?? '');
      }
      output.push(`<pre>${escapeHtml(code.join('\n'))}</pre>`);
    } else if (line.startsWith('> ')) {
      const quote: string[] = [];
      while (index < lines.length && lines[index]?.startsWith('> ')) {
        quote.push(
          inlineMarkdownToHtml((lines[index] ?? '').slice(2), customEmojis),
        );
        index += 1;
      }
      index -= 1;
      output.push(`<blockquote>${quote.join('<br />')}</blockquote>`);
    } else if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*] /.test(lines[index] ?? '')) {
        items.push(
          `<li>${inlineMarkdownToHtml((lines[index] ?? '').slice(2), customEmojis)}</li>`,
        );
        index += 1;
      }
      index -= 1;
      output.push(`<ul>${items.join('')}</ul>`);
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\. /.test(lines[index] ?? '')) {
        items.push(
          `<li>${inlineMarkdownToHtml((lines[index] ?? '').replace(/^\d+\. /, ''), customEmojis)}</li>`,
        );
        index += 1;
      }
      index -= 1;
      output.push(`<ol>${items.join('')}</ol>`);
    } else {
      output.push(inlineMarkdownToHtml(line, customEmojis) || '<br />');
    }
  }

  return output.join('<br />');
};

export const plainTextToHtml = (
  value: string,
  customEmojis: Record<string, { static_url: string; url: string }>,
) =>
  escapeHtml(value)
    .replace(/:([a-zA-Z0-9_+-]+):/g, (shortcode, name: string) => {
      const emoji = customEmojis[name];
      if (!emoji) return shortcode;
      return `<span data-emoji-shortcode="${escapeAttribute(shortcode)}" contenteditable="false"><img src="${escapeAttribute(emoji.url)}" alt="${escapeAttribute(shortcode)}" draggable="false" /></span>`;
    })
    .replace(/\n/g, '<br />');

const wrapInlineMarkdown = (content: string, marker: string) => {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(content);
  if (!match) return content;
  const [, leading = '', core = '', trailing = ''] = match;
  if (!core) return content;
  return `${leading}${marker}${core}${marker}${trailing}`;
};

const parentHasTag = (node: HTMLElement, tags: string[]) =>
  node.parentElement ? tags.includes(node.parentElement.tagName) : false;

const nodeToMarkdown = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';
  const shortcode = node.dataset.emojiShortcode;
  if (shortcode) return shortcode;
  const content = Array.from(node.childNodes).map(nodeToMarkdown).join('');
  switch (node.tagName) {
    case 'STRONG':
    case 'B':
      return parentHasTag(node, ['STRONG', 'B'])
        ? content
        : wrapInlineMarkdown(content, '**');
    case 'EM':
    case 'I':
      return parentHasTag(node, ['EM', 'I'])
        ? content
        : wrapInlineMarkdown(content, '*');
    case 'DEL':
    case 'S':
    case 'STRIKE':
      return parentHasTag(node, ['DEL', 'S', 'STRIKE'])
        ? content
        : wrapInlineMarkdown(content, '~~');
    case 'CODE':
      return parentHasTag(node, ['CODE'])
        ? content
        : wrapInlineMarkdown(content, '`');
    case 'PRE':
      return `\n\`\`\`\n${content}\n\`\`\``;
    case 'BLOCKQUOTE':
      return `\n${content
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')}\n`;
    case 'LI':
      return content;
    case 'OL':
      return `\n${Array.from(node.children)
        .map((child, index) => `${index + 1}. ${nodeToMarkdown(child)}\n`)
        .join('')}\n`;
    case 'UL':
      return `\n${Array.from(node.children)
        .map((child) => `- ${nodeToMarkdown(child)}\n`)
        .join('')}\n`;
    case 'A':
      return `[${content}](${node.getAttribute('href') ?? ''})`;
    case 'BR':
      return '\n';
    case 'DIV':
    case 'P':
      return `\n${content}`;
    default:
      return content;
  }
};

export const editorText = (element: HTMLElement) =>
  Array.from(element.childNodes)
    .map(nodeToMarkdown)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');

const nodeToPlainText = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';
  const shortcode = node.dataset.emojiShortcode;
  if (shortcode) return shortcode;
  const content = Array.from(node.childNodes).map(nodeToPlainText).join('');
  if (node.tagName === 'BR') return '\n';
  if (node.tagName === 'DIV' || node.tagName === 'P') return `\n${content}`;
  return content;
};

export const editorPlainText = (element: HTMLElement) =>
  Array.from(element.childNodes)
    .map(nodeToPlainText)
    .join('')
    .replace(/^\n+|\n+$/g, '');

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

const focusAtEnd = (element: HTMLElement) => {
  element.focus({ preventScroll: true });
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

const commands = [
  ['bold', TextBIcon, messages.bold],
  ['italic', TextItalicIcon, messages.italic],
  ['strikeThrough', TextStrikethroughIcon, messages.strikethrough],
  ['formatBlock', QuotesIcon, messages.quote, 'blockquote'],
  ['insertUnorderedList', ListBulletsIcon, messages.bulletedList],
  ['insertOrderedList', ListNumbersIcon, messages.numberedList],
  ['code', CodeIcon, messages.inlineCode],
  ['formatBlock', CodeBlockIcon, messages.codeBlock, 'pre'],
] as const;

type InlineCommand = 'bold' | 'italic' | 'strikeThrough';

const inlineCommands: readonly InlineCommand[] = [
  'bold',
  'italic',
  'strikeThrough',
];

export const toggleInlineCommand = (command: InlineCommand) => {
  // execCommand remains the only interoperable browser editing primitive that
  // keeps native selection, IME and undo/redo behavior in contentEditable.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const wasActive = document.queryCommandState(command);

  if (!wasActive) {
    for (const otherCommand of inlineCommands) {
      if (otherCommand === command) continue;
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      if (document.queryCommandState(otherCommand)) {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand(otherCommand);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  document.execCommand(command);
};

export const RichComposeEditor: React.FC<{
  onSubmit: (event?: React.SubmitEvent) => void;
  children?: React.ReactNode;
  autoFocus?: boolean;
}> = ({ onSubmit, children, autoFocus }) => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const text = useAppSelector((state) => state.compose.get('text') as string);
  const contentType = useAppSelector(
    (state) => state.compose.get('content_type') as string,
  );
  const isMarkdown = contentType === 'text/markdown';
  const customEmojis = useCustomEmojis();
  const ref = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const localValueRef = useRef<string | null>(null);
  const renderedTextRef = useRef<string | null>(null);
  const renderedContentTypeRef = useRef<string | null>(null);
  const [activeFormats, setActiveFormats] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const updateActiveFormats = useCallback(() => {
    const editor = ref.current;
    const selection = window.getSelection();
    if (
      !isMarkdown ||
      !editor ||
      !selection?.anchorNode ||
      !editor.contains(selection.anchorNode)
    ) {
      setActiveFormats(new Set());
      return;
    }

    const active = new Set<string>();
    for (const command of [
      'bold',
      'italic',
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
  }, [isMarkdown]);

  useEffect(() => {
    if (autoFocus && ref.current) focusAtEnd(ref.current);
  }, [autoFocus]);

  useEffect(() => {
    const editor = ref.current;
    const isLocalUpdate = text === localValueRef.current;
    const textChanged = text !== renderedTextRef.current;
    const contentTypeChanged = contentType !== renderedContentTypeRef.current;
    const wasFocused = document.activeElement === editor;
    if (
      editor &&
      (contentTypeChanged || (!isLocalUpdate && (textChanged || !wasFocused)))
    ) {
      editor.innerHTML = isMarkdown
        ? markdownToHtml(text, customEmojis)
        : plainTextToHtml(text, customEmojis);
      if (wasFocused) focusAtEnd(editor);
    }
    renderedTextRef.current = text;
    renderedContentTypeRef.current = contentType;
    localValueRef.current = null;
    if (hiddenRef.current) hiddenRef.current.value = text;
  }, [contentType, customEmojis, isMarkdown, text]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => {
      document.removeEventListener('selectionchange', updateActiveFormats);
    };
  }, [updateActiveFormats]);

  const sync = () => {
    if (!ref.current) return;
    const value = isMarkdown
      ? editorText(ref.current)
      : editorPlainText(ref.current);
    localValueRef.current = value;
    dispatch(changeCompose(value));
    if (hiddenRef.current) {
      hiddenRef.current.value = value;
      hiddenRef.current.setSelectionRange(value.length, value.length);
    }
  };

  const preventToolbarFocus: React.MouseEventHandler = (event) => {
    event.preventDefault();
    const selection = window.getSelection();
    if (selection?.rangeCount && ref.current?.contains(selection.anchorNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };
  const handleCommand: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    const button = event.currentTarget;
    ref.current?.focus();
    const selection = window.getSelection();
    if (selectionRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(selectionRef.current);
    }
    const command = button.dataset.command ?? 'bold';
    if (inlineCommands.includes(command as InlineCommand)) {
      // execCommand preserves undo/redo, IME and mixed-selection toggle semantics.
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
      const code = ref.current
        ? closestWithin(selectionElement(), 'code', ref.current)
        : null;
      if (code) unwrapElement(code);
      else wrapSelection('code');
    } else {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand(command, false, button.dataset.value);
    }
    dispatch(changeComposeContentType('text/markdown'));
    sync();
    updateActiveFormats();
  };
  const handleLink: React.MouseEventHandler<HTMLButtonElement> = () => {
    ref.current?.focus();
    const selection = window.getSelection();
    if (selectionRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(selectionRef.current);
    }
    const link = ref.current
      ? closestWithin(selectionElement(), 'a', ref.current)
      : null;
    if (link) {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand('unlink');
      sync();
      updateActiveFormats();
      return;
    }

    const url = window.prompt(intl.formatMessage(messages.linkUrl));
    if (url) {
      ref.current?.focus();
      if (selectionRef.current && selection) {
        selection.removeAllRanges();
        selection.addRange(selectionRef.current);
      }
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand('createLink', false, url);
      dispatch(changeComposeContentType('text/markdown'));
      sync();
      updateActiveFormats();
    }
  };
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    const key = normalizeKey(event.key);
    if (key === 'enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit();
    } else if (key === 'escape') {
      event.preventDefault();
      event.stopPropagation();
      dispatch(dismissComposer());
    }
  };
  const handleEditorMouseDown: React.MouseEventHandler<HTMLDivElement> = (
    event,
  ) => {
    event.stopPropagation();
  };
  const handleEditorClick: React.MouseEventHandler<HTMLDivElement> = (
    event,
  ) => {
    event.stopPropagation();
    if (document.activeElement !== ref.current) {
      if (ref.current) focusAtEnd(ref.current);
    }
  };
  const handlePasteOrDrop = (
    event:
      | React.ClipboardEvent<HTMLDivElement>
      | React.DragEvent<HTMLDivElement>,
  ) => {
    const data =
      'clipboardData' in event ? event.clipboardData : event.dataTransfer;
    if (data.files.length > 0) {
      event.preventDefault();
    } else if (!isMarkdown && 'clipboardData' in event) {
      event.preventDefault();
      // Keep plain-text mode visually plain while preserving native undo/redo.
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand('insertText', false, data.getData('text/plain'));
    }
    dispatch(processPasteOrDrop(data));
  };

  return (
    <div className={classes.richEditorWrapper}>
      {isMarkdown && (
        <div
          className={classes.richEditorToolbar}
          role='toolbar'
          aria-label={intl.formatMessage(messages.toolbar)}
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
                onMouseDown={preventToolbarFocus}
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
            onMouseDown={preventToolbarFocus}
            onClick={handleLink}
          >
            {intl.formatMessage(messages.link)}
          </IconButton>
        </div>
      )}
      <div
        ref={ref}
        className={classes.richEditor}
        contentEditable={isMarkdown ? true : 'plaintext-only'}
        suppressContentEditableWarning
        role='textbox'
        aria-multiline='true'
        tabIndex={0}
        onMouseDown={handleEditorMouseDown}
        onClick={handleEditorClick}
        onInput={sync}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        onKeyDown={handleKeyDown}
        onPaste={handlePasteOrDrop}
        onDrop={handlePasteOrDrop}
      />
      {children}
      <textarea
        ref={hiddenRef}
        id={COMPOSER_TEXTAREA_ID}
        className={classes.richEditorTransport}
        tabIndex={-1}
        aria-hidden='true'
        readOnly
      />
    </div>
  );
};
