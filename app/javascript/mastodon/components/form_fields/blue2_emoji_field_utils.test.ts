import { describe, expect, test } from 'vitest';

import type { ExtraCustomEmojiMap } from '@/mastodon/features/emoji/types';

import {
  customEmojiTextParts,
  insertEmojiAtSelection,
  matchingCustomEmojiShortcodes,
} from './blue2_emoji_field_utils';

const customEmojis: ExtraCustomEmojiMap = {
  party: {
    shortcode: 'party',
    static_url: 'https://example.test/party.png',
    url: 'https://example.test/party.gif',
  },
  party_parrot: {
    shortcode: 'party_parrot',
    static_url: 'https://example.test/parrot.png',
    url: 'https://example.test/parrot.gif',
  },
  blueparty: {
    shortcode: 'blueparty',
    static_url: 'https://example.test/blueparty.png',
    url: 'https://example.test/blueparty.gif',
  },
};

describe('Blue 2 emoji profile fields', () => {
  test('renders only existing local custom emoji shortcodes', () => {
    expect(customEmojiTextParts('Hello :party:!', customEmojis)).toEqual([
      { type: 'text', text: 'Hello ' },
      { type: 'emoji', code: 'party', shortcode: ':party:' },
      { type: 'text', text: '!' },
    ]);

    expect(customEmojiTextParts('Hello :missing:!', customEmojis)).toEqual([
      { type: 'text', text: 'Hello :missing:!' },
    ]);
  });

  test('does not render shortcodes embedded in words', () => {
    expect(customEmojiTextParts('hello:party:', customEmojis)).toEqual([
      { type: 'text', text: 'hello:party:' },
    ]);
    expect(customEmojiTextParts(':party:world', customEmojis)).toEqual([
      { type: 'text', text: ':party:world' },
    ]);
  });

  test('allows punctuation around a valid shortcode', () => {
    expect(customEmojiTextParts('(:party:),', customEmojis)).toEqual([
      { type: 'text', text: '(' },
      { type: 'emoji', code: 'party', shortcode: ':party:' },
      { type: 'text', text: '),' },
    ]);
  });

  test('ranks prefix autocomplete matches before substring matches', () => {
    expect(matchingCustomEmojiShortcodes(customEmojis, ':pa')).toEqual([
      'party',
      'party_parrot',
      'blueparty',
    ]);
    expect(matchingCustomEmojiShortcodes(customEmojis, ':party:')).toEqual([]);
  });

  test('inserts a picker shortcode at the caret without joining a word', () => {
    expect(insertEmojiAtSelection('hello', ':party:', 2)).toEqual({
      value: 'he :party: llo',
      caretPosition: 'he :party: '.length,
    });
  });

  test('replaces the active selection and returns the new caret', () => {
    expect(insertEmojiAtSelection('hello world', ':party:', 6, 11)).toEqual({
      value: 'hello :party: ',
      caretPosition: 'hello :party: '.length,
    });
  });

  test('supports insertion at the beginning and end of a field', () => {
    expect(insertEmojiAtSelection('', ':party:', 0)).toEqual({
      value: ':party: ',
      caretPosition: ':party: '.length,
    });

    expect(insertEmojiAtSelection('hello ', ':party:', 6)).toEqual({
      value: 'hello :party: ',
      caretPosition: 'hello :party: '.length,
    });
  });
});
