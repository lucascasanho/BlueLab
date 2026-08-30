import { editorText, markdownToHtml } from './rich_editor';

describe('BlueLab rich editor conversion', () => {
  test('renders supported inline Markdown as semantic elements', () => {
    const html = markdownToHtml('**bold** *italic* ~~strike~~ `code`', {});

    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<del>strike</del>');
    expect(html).toContain('<code>code</code>');
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
});
