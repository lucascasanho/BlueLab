import { afterEach, vi } from 'vitest';

import { editorText, markdownToHtml, toggleInlineCommand } from './rich_editor';

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
  test('renders supported inline Markdown as semantic elements', () => {
    const html = markdownToHtml('**bold** *italic* ~~strike~~ `code`', {});

    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
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

  test('serializes semantic elements back to valid Markdown', () => {
    const editor = document.createElement('div');
    editor.innerHTML =
      '<strong>bold</strong><em>italic</em><blockquote>quote</blockquote><ul><li>first</li><li>second</li></ul><ol><li>one</li><li>two</li></ol>';

    expect(editorText(editor)).toBe(
      '**bold***italic*\n> quote\n\n- first\n- second\n\n1. one\n2. two',
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
});
