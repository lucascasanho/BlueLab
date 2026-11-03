import { describe, expect, test } from 'vitest';

import { markdownToHtml } from './rich_editor';

const customEmojis = {
  party: {
    static_url: 'https://example.test/party.png',
    url: 'https://example.test/party.gif',
  },
};

describe('BlueLab rich editor blank-line rendering', () => {
  test('renders exactly one br per source newline', () => {
    expect(markdownToHtml('first\n\nsecond', {})).toBe(
      'first<br /><br />second',
    );
  });

  test('does not add blank lines when rebuilding around a custom emoji', () => {
    const html = markdownToHtml('first\n\n:party:\n\nlast', customEmojis);
    const breaks = html.match(/<br \/>/g) ?? [];

    expect(breaks).toHaveLength(4);
    expect(html).toContain('data-emoji-shortcode=":party:"');
  });
});
