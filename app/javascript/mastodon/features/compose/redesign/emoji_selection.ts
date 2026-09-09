import { editorPlainText, editorText } from './rich_editor';

const CARET_MARKER = '\uE000BLUELAB_COMPOSE_CARET\uE001';

let lastComposeSelectionOffset = 0;

const composerEditorFromNode = (node: Node | null): HTMLElement | null => {
  const element =
    node instanceof HTMLElement ? node : (node?.parentElement ?? null);

  return (
    element?.closest<HTMLElement>("[data-compose-scroll-zone='editor']") ?? null
  );
};

const pathFromRoot = (root: Node, target: Node): number[] | null => {
  const path: number[] = [];
  let current: Node | null = target;

  while (current !== root) {
    const parent: Node | null = current.parentNode;
    if (!parent) return null;

    const index = Array.from(parent.childNodes).indexOf(current as ChildNode);
    if (index < 0) return null;

    path.unshift(index);
    current = parent;
  }

  return path;
};

const nodeAtPath = (root: Node, path: readonly number[]): Node | null => {
  let current: Node | null = root;

  for (const index of path) {
    current = current.childNodes.item(index);
  }

  return current;
};

const serializeEditor = (editor: HTMLElement) =>
  editor.getAttribute('contenteditable') === 'plaintext-only'
    ? editorPlainText(editor)
    : editorText(editor);

export const getEditorSelectionOffset = (
  editor: HTMLElement | null,
): number => {
  if (!editor) return 0;

  const selection = window.getSelection();
  if (!selection?.rangeCount) return 0;

  const range = selection.getRangeAt(0);
  const startContainer = range.startContainer;
  if (startContainer !== editor && !editor.contains(startContainer)) return 0;

  const path = pathFromRoot(editor, startContainer);
  if (!path) return 0;

  const clone = editor.cloneNode(true) as HTMLElement;
  const cloneContainer = nodeAtPath(clone, path);
  if (!cloneContainer) return 0;

  const marker = document.createTextNode(CARET_MARKER);

  if (cloneContainer.nodeType === Node.TEXT_NODE) {
    const textNode = cloneContainer as Text;
    const offset = Math.min(range.startOffset, textNode.length);
    const tail = textNode.splitText(offset);
    tail.parentNode?.insertBefore(marker, tail);
  } else {
    const offset = Math.min(
      range.startOffset,
      cloneContainer.childNodes.length,
    );
    cloneContainer.insertBefore(marker, cloneContainer.childNodes.item(offset));
  }

  const serialized = serializeEditor(clone);
  const markerIndex = serialized.indexOf(CARET_MARKER);

  return markerIndex >= 0 ? markerIndex : 0;
};

export const captureComposerSelectionOffset = (): number => {
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLTextAreaElement) {
    lastComposeSelectionOffset = activeElement.selectionStart;
    return lastComposeSelectionOffset;
  }

  const selection = window.getSelection();
  const editor = selection?.rangeCount
    ? composerEditorFromNode(selection.getRangeAt(0).startContainer)
    : null;

  if (editor) {
    lastComposeSelectionOffset = getEditorSelectionOffset(editor);
  }

  return lastComposeSelectionOffset;
};

export const getSavedComposerSelectionOffset = () => lastComposeSelectionOffset;

export const setSavedComposerSelectionOffset = (offset: number) => {
  lastComposeSelectionOffset = Math.max(0, offset);
};
