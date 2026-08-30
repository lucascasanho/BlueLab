/* eslint-disable react/jsx-no-bind -- editor handlers are stable closures required by contentEditable. */
import type React from 'react';
import { useEffect, useRef } from 'react';

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
import { IconButton } from '@/mastodon/components/button/redesign';
import { normalizeKey } from '@/mastodon/components/hotkeys/utils';
import type { IconProp } from '@/mastodon/components/icon';
import { COMPOSER_TEXTAREA_ID } from '@/mastodon/reducers/slices/composer';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import classes from './styles.module.scss';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const markdownToHtml = (value: string) =>
  value
    .split('\n')
    .map((line) => {
      const escaped = escapeHtml(line)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/~~([^~]+)~~/g, '<del>$1</del>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>');
      return escaped || '<br />';
    })
    .join('<br />');

const nodeToMarkdown = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';
  const content = Array.from(node.childNodes).map(nodeToMarkdown).join('');
  switch (node.tagName) {
    case 'STRONG':
    case 'B':
      return `**${content}**`;
    case 'EM':
    case 'I':
      return `*${content}*`;
    case 'DEL':
    case 'S':
      return `~~${content}~~`;
    case 'CODE':
      return `\`${content}\``;
    case 'PRE':
      return `\n\`\`\`\n${content}\n\`\`\``;
    case 'BLOCKQUOTE':
      return content
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    case 'LI':
      return `- ${content}\n`;
    case 'OL':
      return Array.from(node.children)
        .map((child, index) => `${index + 1}. ${nodeToMarkdown(child)}`)
        .join('');
    case 'UL':
      return content;
    case 'A':
      return `[${content}](${node.getAttribute('href') ?? ''})`;
    case 'BR':
      return '\n';
    default:
      return content;
  }
};

const editorText = (element: HTMLElement) =>
  Array.from(element.childNodes)
    .map(nodeToMarkdown)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n|\n$/g, '');

const commands = [
  ['bold', TextBIcon, 'Bold'],
  ['italic', TextItalicIcon, 'Italic'],
  ['strikeThrough', TextStrikethroughIcon, 'Strikethrough'],
  ['formatBlock', QuotesIcon, 'Quote', 'blockquote'],
  ['insertUnorderedList', ListBulletsIcon, 'Bulleted list'],
  ['insertOrderedList', ListNumbersIcon, 'Numbered list'],
  ['code', CodeIcon, 'Inline code'],
  ['pre', CodeBlockIcon, 'Code block'],
] as const;

export const RichComposeEditor: React.FC<{
  onSubmit: (event?: React.SubmitEvent) => void;
  children?: React.ReactNode;
  autoFocus?: boolean;
}> = ({ onSubmit, children, autoFocus }) => {
  const dispatch = useAppDispatch();
  const text = useAppSelector((state) => state.compose.get('text') as string);
  const ref = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLTextAreaElement>(null);
  const localValueRef = useRef<string | null>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (ref.current && text !== localValueRef.current) {
      ref.current.innerHTML = markdownToHtml(text);
    }
    localValueRef.current = null;
    if (hiddenRef.current) hiddenRef.current.value = text;
  }, [text]);

  const sync = () => {
    if (!ref.current) return;
    const value = editorText(ref.current);
    localValueRef.current = value;
    dispatch(changeCompose(value));
    if (hiddenRef.current) {
      hiddenRef.current.value = value;
      hiddenRef.current.setSelectionRange(value.length, value.length);
    }
  };

  const preventToolbarFocus: React.MouseEventHandler = (event) => {
    event.preventDefault();
  };
  const handleCommand: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    const button = event.currentTarget;
    ref.current?.focus();
    dispatch(changeComposeContentType('text/markdown'));
    // execCommand is the browser editing primitive for preserving selection/IME.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(
      button.dataset.command ?? 'bold',
      false,
      button.dataset.value,
    );
    sync();
  };
  const handleLink: React.MouseEventHandler<HTMLButtonElement> = () => {
    const url = window.prompt('URL');
    if (url) {
      ref.current?.focus();
      dispatch(changeComposeContentType('text/markdown'));
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand('createLink', false, url);
      sync();
    }
  };
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    const key = normalizeKey(event.key);
    if (key === 'enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit();
    } else if (key === 'escape') {
      event.currentTarget.blur();
    }
  };

  return (
    <div className={classes.richEditorWrapper}>
      <div
        className={classes.richEditorToolbar}
        role='toolbar'
        aria-label='Formatting'
      >
        {commands.map(([command, icon, label, value]) => (
          <IconButton
            key={command}
            as='button'
            type='button'
            size='sm'
            icon={icon as IconProp}
            data-command={command}
            data-value={value}
            onMouseDown={preventToolbarFocus}
            onClick={handleCommand}
          >
            {label}
          </IconButton>
        ))}
        <IconButton
          as='button'
          type='button'
          size='sm'
          icon={LinkIcon}
          onMouseDown={preventToolbarFocus}
          onClick={handleLink}
        >
          Link
        </IconButton>
      </div>
      <div
        ref={ref}
        className={classes.richEditor}
        contentEditable
        suppressContentEditableWarning
        role='textbox'
        aria-multiline='true'
        tabIndex={0}
        onInput={sync}
        onKeyDown={handleKeyDown}
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
