import { afterEach, vi } from 'vitest';

import {
  captureComposerSelectionOffset,
  editorPlainText,
  editorText,
  getSavedComposerSelectionOffset,
  insertTextAtSelection,
  markdownToHtml,
  plainTextToHtml,
  renderEmojiShortcodes,
  toggleInlineCommand,
} from './rich_editor';

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, 'queryCommandState');
  Reflect.deleteProperty(document, 'execCommand');
});

const mockEditingCommands = (query: (command: string) => boolean) => {
  const queryCommandState = vi.fn(query);
  const execCommand = vi.fn(() => true);
  Object.defineProperties(document, {
    queryCommandState: {
      configurable: true,
      value: queryCommandState,
    },
    execCommand: {
      configurable: true,
      value: execCommand,
    },
  });
  return { queryCommandState, execCommand };
};

describe('BlueLab rich editor conversion', () => {
  test('keeps the cursor offset aligned after each insertion so sequences stay in order', () => {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.textContent = 'hello world';
    document.body.appendChild(editor);

    const node = editor.firstChild;
    if (!node) {
      throw new Error('Expected editor text node');
    }

    const range = document.createRange();
    range.setStart(node, 6);
    range.collapse(true);
    const selection = window.getSelection();
    if (!selection) {
      throw new Error('Expected selection');
    }
    selection.removeAllRanges();
    selection.addRange(range);

    insertTextAtSelection('🙂');
    expect(getSavedComposerSelectionOffset()).toBe(8);
    expect(editor.textContent).toBe('hello 🙂world');

    insertTextAtSelection('🚀');
    expect(editor.textContent).toBe('hello 🙂🚀world');
    expect(getSavedComposerSelectionOffset()).toBe(10);

    document.body.removeChild(editor);
  });

  test('renders supported inline Markdown as semantic elements', () => {
    const html = markdownToHtml(
      '**bold** *italic* _underline_ ~~strike~~ `code`',
      {},
    );

    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<u>underline</u>');
    expect(html).toContain('<del>strike</del>');
    expect(html).toContain('<code>code</code>');
  });

  test('preserves combined bold and italic formatting', () => {
    expect(markdownToHtml('***both***', {})).toBe(
      '<strong><em>both</em></strong>',
    );
  });

  test('renders quotes, lists and fenced code blocks', () => {
    const html = markdownToHtml(
      '> quote\n- first\n- second\n1. one\n2. two\n```\nconst safe = true;\n```',
      {},
    );

    expect(html).toContain('<blockquote>quote</blockquote>');
    expect(html).toContain('<ul><li>first</li><li>second</li></ul>');
    expect(html).toContain('<ol><li>one</li><li>two</li></ol>');
    expect(html).toContain('<pre>const safe = true;</pre>');
  });

  test('renders custom emoji using its animated URL', () => {
    const html = markdownToHtml(':party:', {
      party: {
        static_url: 'https://example.test/static.png',
        url: 'https://example.test/animated.gif',
      },
    });

    expect(html).toContain('src="https://example.test/animated.gif"');
    expect(html).toContain('data-emoji-shortcode=":party:"');
  });

  test('keeps Markdown literal in plain-text mode while rendering custom emoji', () => {
    const html = plainTextToHtml('**bold**\n:party:', {
      party: {
        static_url: 'https://example.test/static.png',
        url: 'https://example.test/animated.gif',
      },
    });

    expect(html).toContain('**bold**<br />');
    expect(html).not.toContain('<strong>');
    expect(html).toContain('src="https://example.test/animated.gif"');
  });

  test('serializes semantic elements back to valid Markdown', () => {
    const editor = document.createElement('div');
    editor.innerHTML =
      '<strong>bold</strong><em>italic</em><u>underline</u><blockquote>quote</blockquote><ul><li>first</li><li>second</li></ul><ol><li>one</li><li>two</li></ol>';

    expect(editorText(editor)).toBe(
      '**bold***italic*_underline_\n> quote\n\n- first\n- second\n\n1. one\n2. two',
    );
  });

  test('preserves browser-created paragraph and line containers', () => {
    const editor = document.createElement('div');
    editor.innerHTML = '<div>first</div><p><strong>second</strong></p>';

    expect(editorText(editor)).toBe('first\n**second**');
  });

  test('preserves a line break before a browser-created div', () => {
    const editor = document.createElement('div');
    editor.innerHTML = 'first<div><b>second</b></div>';

    expect(editorText(editor)).toBe('first\n**second**');
  });

  test('keeps whitespace outside Markdown delimiters', () => {
    const editor = document.createElement('div');
    editor.innerHTML =
      '<b>bold </b><i> italic</i><strike>strike </strike><code> code</code>';

    expect(editorText(editor)).toBe('**bold**  *italic*~~strike~~  `code`');
  });

  test('does not duplicate delimiters for nested equal formatting', () => {
    const editor = document.createElement('div');
    editor.innerHTML = '<strong><b>bold</b></strong><em><i>italic</i></em>';

    expect(editorText(editor)).toBe('**bold***italic*');
  });

  test('serializes a plain editor without leaking visual markup', () => {
    const editor = document.createElement('div');
    editor.innerHTML =
      '<strong>bold</strong><div>next <span data-emoji-shortcode=":party:"><img /></span></div>';

    expect(editorPlainText(editor)).toBe('bold\nnext :party:');
  });

  test('turns the selected inline format off when it is clicked again', () => {
    const { execCommand } = mockEditingCommands(() => true);

    toggleInlineCommand('bold');

    expect(execCommand).toHaveBeenCalledOnce();
    expect(execCommand).toHaveBeenCalledWith('bold');
  });

  test('replaces the selected inline format when another one is chosen', () => {
    const { execCommand } = mockEditingCommands(
      (command) => command === 'bold',
    );

    toggleInlineCommand('italic');

    expect(execCommand).toHaveBeenNthCalledWith(1, 'bold');
    expect(execCommand).toHaveBeenNthCalledWith(2, 'italic');
  });

  test('uses the browser underline command for Markdown underline', () => {
    const { execCommand } = mockEditingCommands(() => false);

    toggleInlineCommand('underline');

    expect(execCommand).toHaveBeenCalledWith('underline');
  });

  test('stores the cursor offset before opening the emoji picker', () => {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.textContent = 'hello world';
    document.body.appendChild(editor);
    editor.focus();

    const node = editor.firstChild;
    if (!node) {
      throw new Error('Expected editor text node');
    }

    const range = document.createRange();
    range.setStart(node, 6);
    range.collapse(true);
    const selection = window.getSelection();
    if (!selection) {
      throw new Error('Expected selection');
    }
    selection.removeAllRanges();
    selection.addRange(range);

    expect(captureComposerSelectionOffset()).toBe(6);
    expect(getSavedComposerSelectionOffset()).toBe(6);
    document.body.removeChild(editor);
  });

  test('inserts emoji at the active text cursor instead of appending at the end', () => {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.textContent = 'hello world';
    document.body.appendChild(editor);

    const node = editor.firstChild;
    if (!node) {
      throw new Error('Expected editor text node');
    }

    const range = document.createRange();
    range.setStart(node, 6);
    range.collapse(true);
    const selection = window.getSelection();
    if (!selection) {
      throw new Error('Expected selection');
    }
    selection.removeAllRanges();
    selection.addRange(range);

    insertTextAtSelection('🙂');

    expect(editor.textContent).toBe('hello 🙂world');
    document.body.removeChild(editor);
  });

  test('keeps repeated emoji selections in the same order as the live cursor', () => {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.textContent = 'hello';
    document.body.appendChild(editor);

    const selection = window.getSelection();
    if (!selection) {
      throw new Error('Expected selection');
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    insertTextAtSelection('🙂');
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    insertTextAtSelection('😎');
    insertTextAtSelection('🚀');

    expect(editor.textContent).toBe('hello🙂😎🚀');
    document.body.removeChild(editor);
  });

  test('renders typed custom emoji shortcodes immediately without waiting for the picker', () => {
    const html = renderEmojiShortcodes('hello :party: world', {
      party: {
        static_url: 'https://example.test/static.png',
        url: 'https://example.test/animated.gif',
      },
    });

    expect(html).toContain('data-emoji-shortcode=":party:"');
    expect(html).toContain('src="https://example.test/animated.gif"');
    expect(html).toContain('hello ');
    expect(html).toContain(' world');
  });
});
