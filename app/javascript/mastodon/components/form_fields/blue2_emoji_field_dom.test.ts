import { describe, expect, test } from 'vitest';

import {
  clearEmptyProfileEmojiEditorPlaceholder,
} from './blue2_emoji_field_dom';

describe('Blue 2 profile editor placeholder cleanup', () => {
  test(
    'clears browser-only placeholder DOM while the source value is empty',
    () => {
      const editor = document.createElement('div');

      editor.innerHTML = '<br>';
      expect(clearEmptyProfileEmojiEditorPlaceholder(editor, '')).toBe(true);
      expect(editor.childNodes).toHaveLength(0);

      editor.innerHTML = '<div><br></div>';
      expect(clearEmptyProfileEmojiEditorPlaceholder(editor, '')).toBe(true);
      expect(editor.childNodes).toHaveLength(0);

      editor.innerHTML = '&nbsp;';
      expect(clearEmptyProfileEmojiEditorPlaceholder(editor, '')).toBe(true);
      expect(editor.childNodes).toHaveLength(0);
    },
  );

  test('preserves real user text and ordinary spaces', () => {
    const editor = document.createElement('div');

    editor.textContent = ' ';
    expect(clearEmptyProfileEmojiEditorPlaceholder(editor, '')).toBe(false);
    expect(editor.textContent).toBe(' ');

    editor.textContent = 'hello';
    expect(clearEmptyProfileEmojiEditorPlaceholder(editor, '')).toBe(false);
    expect(editor.textContent).toBe('hello');
  });

  test('does not alter editor DOM when the source already has a value', () => {
    const editor = document.createElement('div');
    editor.innerHTML = '<br>';

    expect(
      clearEmptyProfileEmojiEditorPlaceholder(editor, 'hello'),
    ).toBe(false);
    expect(editor.innerHTML).toBe('<br>');
  });
});
