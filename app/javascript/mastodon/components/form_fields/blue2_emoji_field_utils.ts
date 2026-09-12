import type { ExtraCustomEmojiMap } from '@/mastodon/features/emoji/types';
import { insertEmojiAtPosition } from '@/mastodon/features/emoji/utils';

const CUSTOM_EMOJI_PATTERN = /:([a-zA-Z0-9_+-]+):/g;
const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}_+-]/u;

interface SerializedPoint {
  node: Node;
  offset: number;
}

export type CustomEmojiTextPart =
  | { type: 'text'; text: string }
  | { type: 'emoji'; code: string; shortcode: string };

const isTokenBoundary = (character: string | undefined) =>
  !character || !WORD_CHARACTER_PATTERN.test(character);

const isBlockElement = (element: HTMLElement) =>
  element.tagName === 'DIV' || element.tagName === 'P';

const isEmptyBlockElement = (element: HTMLElement) =>
  isBlockElement(element) &&
  element.childNodes.length === 1 &&
  element.firstChild instanceof HTMLElement &&
  element.firstChild.tagName === 'BR';

export function customEmojiTextParts(
  text: string,
  customEmojis: ExtraCustomEmojiMap,
): CustomEmojiTextPart[] {
  const parts: CustomEmojiTextPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CUSTOM_EMOJI_PATTERN)) {
    const code = match[1];
    const start = match.index;

    if (!code || !Object.hasOwn(customEmojis, code)) continue;

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
  maxLength?: number,
) {
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));
  const withoutSelection = `${text.slice(0, start)}${text.slice(end)}`;
  const nextValue = insertEmojiAtPosition(withoutSelection, emoji, start);

  if (maxLength !== undefined && nextValue.length > maxLength) return null;

  return {
    value: nextValue,
    caretPosition: start + (nextValue.length - withoutSelection.length),
  };
}

export function customEmojiDeletionRange(
  text: string,
  customEmojis: ExtraCustomEmojiMap,
  caretPosition: number,
  direction: 'backward' | 'forward',
) {
  let offset = 0;

  for (const part of customEmojiTextParts(text, customEmojis)) {
    const length = part.type === 'emoji' ? part.shortcode.length : part.text.length;
    const start = offset;
    const end = start + length;

    if (
      part.type === 'emoji' &&
      ((direction === 'backward' && caretPosition === end) ||
        (direction === 'forward' && caretPosition === start))
    ) {
      return { start, end };
    }

    offset = end;
  }

  return null;
}

const nodeSerializedText = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';

  const shortcode = node.dataset.emojiShortcode;
  if (shortcode) return shortcode;
  if (node.tagName === 'BR') return '\n';
  if (isEmptyBlockElement(node)) return '\n';

  const content = Array.from(node.childNodes).map(nodeSerializedText).join('');
  if (isBlockElement(node)) return `\n${content}`;
  return content;
};

export const profileEmojiEditorText = (editor: HTMLElement) => {
  const children = Array.from(editor.childNodes);
  const firstChild = children[0];

  if (
    children.length === 1 &&
    firstChild instanceof HTMLElement &&
    firstChild.tagName === 'BR'
  ) {
    return '';
  }

  const text = children.map(nodeSerializedText).join('');
  return firstChild instanceof HTMLElement && isBlockElement(firstChild)
    ? text.slice(1)
    : text;
};

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
  if (
    !editor.contains(range.startContainer) ||
    !editor.contains(range.endContainer)
  ) {
    return { start: text.length, end: text.length };
  }

  return {
    start: serializedOffsetTo(editor, range.startContainer, range.startOffset),
    end: serializedOffsetTo(editor, range.endContainer, range.endOffset),
  };
}

const pointAtSerializedOffset = (
  editor: HTMLElement,
  targetOffset: number,
): SerializedPoint => {
  let remaining = Math.max(0, targetOffset);

  const pointAround = (
    element: HTMLElement,
    after: boolean,
  ): SerializedPoint | null => {
    const parent = element.parentNode;
    if (!parent) return null;
    const index = Array.from(parent.childNodes).indexOf(element);
    return { node: parent, offset: index + (after ? 1 : 0) };
  };

  const visit = (
    node: Node,
    skipBlockPrefix = false,
  ): SerializedPoint | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) return { node, offset: remaining };
      remaining -= length;
      return null;
    }

    if (!(node instanceof HTMLElement)) return null;

    const shortcode = node.dataset.emojiShortcode;
    if (shortcode) {
      if (remaining === 0) return pointAround(node, false);
      if (remaining <= shortcode.length) return pointAround(node, true);
      remaining -= shortcode.length;
      return null;
    }

    if (node.tagName === 'BR') {
      if (remaining <= 1) return pointAround(node, remaining === 1);
      remaining -= 1;
      return null;
    }

    if (isBlockElement(node) && !skipBlockPrefix) {
      if (remaining === 0) return pointAround(node, false);
      remaining -= 1;
    }

    if (isEmptyBlockElement(node)) {
      return remaining === 0 ? pointAround(node, true) : null;
    }

    for (const child of Array.from(node.childNodes)) {
      const point = visit(child);
      if (point) return point;
    }

    return null;
  };

  const children = Array.from(editor.childNodes);
  const firstChild = children[0];
  if (
    children.length === 1 &&
    firstChild instanceof HTMLElement &&
    firstChild.tagName === 'BR'
  ) {
    return { node: editor, offset: 0 };
  }

  for (const [index, child] of children.entries()) {
    const skipBlockPrefix =
      index === 0 && child instanceof HTMLElement && isBlockElement(child);
    const point = visit(child, skipBlockPrefix);
    if (point) return point;
  }

  return { node: editor, offset: editor.childNodes.length };
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
