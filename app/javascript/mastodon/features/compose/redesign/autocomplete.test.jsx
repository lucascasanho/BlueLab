import { afterEach } from 'vitest';

import {
  editorAutocompleteText,
  getEditorAutocompleteContext,
  renderCompletedCustomEmoji,
} from './autocomplete';

afterEach(() => {
  document.body.replaceChildren();
  window.getSelection()?.removeAllRanges();
});

describe('redesigned composer autocomplete', () => {
  test('tracks the caret correctly on browser-created multiline blocks', () => {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.innerHTML = 'first<div>@lu</div>';
    document.body.appendChild(editor);

    const tokenNode = editor.querySelector('div')?.firstChild;
    if (!tokenNode) throw new Error('Expected second-line text node');

    const range = document.createRange();
    range.setStart(tokenNode, 3);
    range.collapse(true);

    const selection = window.getSelection();
    if (!selection) throw new Error('Expected selection');
    selection.removeAllRanges();
    selection.addRange(range);

    expect(editorAutocompleteText(editor)).toBe('first\n@lu');
    expect(getEditorAutocompleteContext(editor)).toEqual({
      value: 'first\n@lu',
      caretPosition: 'first\n@lu'.length,
    });
  });

  test('renders a completed local custom emoji without changing its serialized shortcode', () => {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.textContent = 'hello :party:';
    document.body.appendChild(editor);

    const textNode = editor.firstChild;
    if (!textNode) throw new Error('Expected editor text node');

    const range = document.createRange();
    range.setStart(textNode, 'hello :party:'.length);
    range.collapse(true);

    const selection = window.getSelection();
    if (!selection) throw new Error('Expected selection');
    selection.removeAllRanges();
    selection.addRange(range);

    expect(
      renderCompletedCustomEmoji(editor, {
        party: {
          static_url: 'https://example.test/static.png',
          url: 'https://example.test/animated.gif',
        },
      }),
    ).toBe(true);

    const emoji = editor.querySelector('[data-emoji-shortcode=":party:"]');
    expect(emoji).not.toBeNull();
    expect(emoji?.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.test/animated.gif',
    );
    expect(editorAutocompleteText(editor)).toBe('hello :party:');
  });
});
