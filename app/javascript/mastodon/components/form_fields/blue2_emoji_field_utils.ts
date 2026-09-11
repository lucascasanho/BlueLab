import type { ExtraCustomEmojiMap } from '@/mastodon/features/emoji/types';
import { insertEmojiAtPosition } from '@/mastodon/features/emoji/utils';

const CUSTOM_EMOJI_PATTERN = /:([a-zA-Z0-9_+-]+):/g;
const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}_+-]/u;

export type CustomEmojiTextPart =
  | { type: 'text'; text: string }
  | { type: 'emoji'; code: string; shortcode: string };

const isTokenBoundary = (character: string | undefined) =>
  !character || !WORD_CHARACTER_PATTERN.test(character);

export function customEmojiTextParts(
  text: string,
  customEmojis: ExtraCustomEmojiMap,
): CustomEmojiTextPart[] {
  const parts: CustomEmojiTextPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CUSTOM_EMOJI_PATTERN)) {
    const code = match[1];
    const start = match.index;

    if (!code || start === undefined || !customEmojis[code]) continue;

    const shortcode = match[0];
    const end = start + shortcode.length;
    if (!isTokenBoundary(text[start - 1]) || !isTokenBoundary(text[end])) {
      continue;
    }

    if (start > lastIndex) {
      parts.push({ type: 'text', text: text.slice(lastIndex, start) });
    }
    parts.push({ type: 'emoji', code, shortcode });
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return parts;
}

export function matchingCustomEmojiShortcodes(
  customEmojis: ExtraCustomEmojiMap,
  token: string,
  limit = 8,
): string[] {
  if (!token.startsWith(':') || token.endsWith(':')) return [];

  const query = token.slice(1).toLocaleLowerCase();
  if (query.length < 2) return [];

  return Object.keys(customEmojis)
    .filter((shortcode) => shortcode.toLocaleLowerCase().includes(query))
    .sort((left, right) => {
      const leftStarts = left.toLocaleLowerCase().startsWith(query);
      const rightStarts = right.toLocaleLowerCase().startsWith(query);
      if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
      return left.localeCompare(right);
    })
    .slice(0, limit);
}

export function insertEmojiAtSelection(
  text: string,
  emoji: string,
  selectionStart: number,
  selectionEnd = selectionStart,
) {
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));
  const withoutSelection = `${text.slice(0, start)}${text.slice(end)}`;
  const nextValue = insertEmojiAtPosition(withoutSelection, emoji, start);

  return {
    value: nextValue,
    caretPosition: start + (nextValue.length - withoutSelection.length),
  };
}

const nodeSerializedText = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';

  const shortcode = node.dataset.emojiShortcode;
  if (shortcode) return shortcode;
  if (node.tagName === 'BR') return '\n';

  const content = Array.from(node.childNodes).map(nodeSerializedText).join('');
  if (node.tagName === 'DIV' || node.tagName === 'P') return `\n${content}`;
  return content;
};

export const profileEmojiEditorText = (editor: HTMLElement) =>
  Array.from(editor.childNodes).map(nodeSerializedText).join('');

const serializedOffsetTo = (
  editor: HTMLElement,
  node: Node,
  offset: number,
) => {
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.setEnd(node, offset);
  const container = document.createElement('div');
  container.append(range.cloneContents());
  return profileEmojiEditorText(container).length;
};

export function profileEmojiEditorSelection(editor: HTMLElement) {
  const text = profileEmojiEditorText(editor);
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { start: text.length, end: text.length };
  }

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) {
    return { start: text.length, end: text.length };
  }

  return {
    start: serializedOffsetTo(editor, range.startContainer, range.startOffset),
    end: serializedOffsetTo(editor, range.endContainer, range.endOffset),
  };
}

const pointAtSerializedOffset = (editor: HTMLElement, targetOffset: number) => {
  let remaining = Math.max(0, targetOffset);
  let point: { node: Node; offset: number } | null = null;

  const pointAround = (element: HTMLElement, after: boolean) => {
    const parent = element.parentNode;
    if (!parent) return null;
    const index = Array.prototype.indexOf.call(parent.childNodes, element) as number;
    return { node: parent, offset: index + (after ? 1 : 0) };
  };

  const visit = (node: Node) => {
    if (point) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) point = { node, offset: remaining };
      else remaining -= length;
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    const shortcode = node.dataset.emojiShortcode;
    if (shortcode) {
      if (remaining === 0) point = pointAround(node, false);
      else if (remaining <= shortcode.length) point = pointAround(node, true);
      else remaining -= shortcode.length;
      return;
    }

    if (node.tagName === 'BR') {
      const around = pointAround(node, remaining === 1);
      if (remaining <= 1 && around) point = around;
      else remaining -= 1;
      return;
    }

    if (node.tagName === 'DIV' || node.tagName === 'P') {
      if (remaining === 0) {
        point = pointAround(node, false);
        return;
      }
      remaining -= 1;
    }

    for (const child of Array.from(node.childNodes)) {
      visit(child);
      if (point) return;
    }
  };

  for (const child of Array.from(editor.childNodes)) {
    visit(child);
    if (point) break;
  }

  return point ?? { node: editor, offset: editor.childNodes.length };
};

export function setProfileEmojiEditorSelection(
  editor: HTMLElement,
  selectionStart: number,
  selectionEnd = selectionStart,
) {
  const selection = window.getSelection();
  if (!selection) return;

  const start = pointAtSerializedOffset(editor, selectionStart);
  const end = pointAtSerializedOffset(editor, selectionEnd);
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}
