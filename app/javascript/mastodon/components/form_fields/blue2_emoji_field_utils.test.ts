import { describe, expect, test } from 'vitest';

import type { ExtraCustomEmojiMap } from '@/mastodon/features/emoji/types';

import {
  customEmojiTextParts,
  insertEmojiAtSelection,
  matchingCustomEmojiShortcodes,
  profileEmojiEditorSelection,
  profileEmojiEditorText,
  setProfileEmojiEditorSelection,
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

  test('does not insert an emoji beyond the field maximum length', () => {
    expect(insertEmojiAtSelection('12345', ':party:', 5, 5, 10)).toBeNull();

    expect(insertEmojiAtSelection('hello world', ':party:', 6, 11, 20)).toEqual(
      {
        value: 'hello :party: ',
        caretPosition: 'hello :party: '.length,
      },
    );
  });

  test('serializes browser contenteditable line blocks without duplication', () => {
    const editor = document.createElement('div');

    editor.innerHTML = 'hello<div><br></div>';
    expect(profileEmojiEditorText(editor)).toBe('hello\n');

    editor.innerHTML = '<div>one</div><div>two</div>';
    expect(profileEmojiEditorText(editor)).toBe('one\ntwo');

    editor.innerHTML = '<div>one</div><div><br></div><div>three</div>';
    expect(profileEmojiEditorText(editor)).toBe('one\n\nthree');
  });

  test('serializes custom emoji tokens together with block line breaks', () => {
    const editor = document.createElement('div');
    editor.innerHTML =
      'Hi <span data-emoji-shortcode=":party:"></span><div>there</div>';

    expect(profileEmojiEditorText(editor)).toBe('Hi :party:\nthere');
  });

  test('round-trips the caret around a rendered custom emoji token', () => {
    const editor = document.createElement('div');
    editor.innerHTML =
      '<span>hello </span><span data-emoji-shortcode=":party:"></span><span> world</span>';
    document.body.append(editor);

    const afterEmoji = 'hello :party:'.length;
    setProfileEmojiEditorSelection(editor, afterEmoji);
    expect(profileEmojiEditorSelection(editor)).toEqual({
      start: afterEmoji,
      end: afterEmoji,
    });

    const insideTrailingText = afterEmoji + 3;
    setProfileEmojiEditorSelection(editor, insideTrailingText);
    expect(profileEmojiEditorSelection(editor)).toEqual({
      start: insideTrailingText,
      end: insideTrailingText,
    });

    editor.remove();
    window.getSelection()?.removeAllRanges();
  });

  test('round-trips the caret across browser block line breaks', () => {
    const editor = document.createElement('div');
    editor.innerHTML = '<div>one</div><div>two</div>';
    document.body.append(editor);

    const secondLineStart = 'one\n'.length;
    setProfileEmojiEditorSelection(editor, secondLineStart);
    expect(profileEmojiEditorSelection(editor)).toEqual({
      start: secondLineStart,
      end: secondLineStart,
    });

    editor.remove();
    window.getSelection()?.removeAllRanges();
  });
});
