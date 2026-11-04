import { afterEach } from 'vitest';

import {
  captureComposerSelectionOffset,
  getEditorSelectionOffset,
  getSavedComposerSelectionOffset,
  setSavedComposerSelectionOffset,
} from './emoji_selection';

afterEach(() => {
  document.body.innerHTML = '';
  window.getSelection()?.removeAllRanges();
  setSavedComposerSelectionOffset(0);
});

const placeCaret = (node: Node, offset: number) => {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);

  const selection = window.getSelection();
  if (!selection) throw new Error('Expected DOM selection');

  selection.removeAllRanges();
  selection.addRange(range);
};

describe('BlueLab emoji selection tracking', () => {
  test('keeps the caret aligned with browser-created lines in plain text', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'plaintext-only');
    editor.dataset.composeScrollZone = 'editor';
    editor.innerHTML = '<div>first line</div><div>second line</div>';
    document.body.appendChild(editor);

    const secondLine = editor.lastChild?.firstChild;
    if (!secondLine) throw new Error('Expected second line text');

    placeCaret(secondLine, 'second line'.length);

    expect(getEditorSelectionOffset(editor)).toBe(
      'first line\nsecond line'.length,
    );
    expect(captureComposerSelectionOffset()).toBe(
      'first line\nsecond line'.length,
    );
    expect(getSavedComposerSelectionOffset()).toBe(
      'first line\nsecond line'.length,
    );
  });

  test('maps a Markdown caret inside formatting before the closing delimiter', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    editor.dataset.composeScrollZone = 'editor';
    editor.innerHTML = '<strong>hello</strong> world';
    document.body.appendChild(editor);

    const boldText = editor.querySelector('strong')?.firstChild;
    if (!boldText) throw new Error('Expected bold text');

    placeCaret(boldText, 'hello'.length);

    expect(getEditorSelectionOffset(editor)).toBe('**hello'.length);
  });

  test('counts rendered custom emoji by their shortcode at the caret', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'plaintext-only');
    editor.dataset.composeScrollZone = 'editor';
    editor.innerHTML =
      'hello <span data-emoji-shortcode=":party:" contenteditable="false"><img alt=":party:" /></span> world';
    document.body.appendChild(editor);

    const tail = editor.lastChild;
    if (!tail) throw new Error('Expected trailing text');

    placeCaret(tail, ' world'.length);

    expect(getEditorSelectionOffset(editor)).toBe('hello :party: world'.length);
  });
});
