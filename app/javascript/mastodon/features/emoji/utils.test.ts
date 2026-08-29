import { isCustomEmoji, isUnicodeEmoji, stringHasUnicodeFlags } from './utils';

describe('isUnicodeEmoji', () => {
  test.concurrent.for([
    ['😊', true],
    ['🇿🇼', true],
    ['🏴‍☠️', true],
    ['🏳️‍🌈', true],
    ['foo', false],
    [':smile:', false],
    ['😊foo', false],
  ] as const)('isUnicodeEmoji("%s") is %o', ([input, expected], { expect }) => {
    expect(isUnicodeEmoji(input)).toBe(expected);
  });

  test.concurrent.for([
    '🇧🇷',
    '🇺🇸',
    '🇯🇵',
    '🇩🇪',
    '❤️',
    '☕',
    '☺️',
    '🏳️‍🌈',
    '👨‍💻',
    '👨‍👩‍👧',
  ])(
    'preserves the complete Unicode emoji sequence "%s"',
    (emoji, { expect }) => {
      expect(isUnicodeEmoji(emoji)).toBe(true);
    },
  );
});

describe('isCustomEmoji', () => {
  test.concurrent.for([
    [':smile:', true],
    [':smile_123:', true],
    [':SMILE:', true],
    ['😊', false],
    ['foo', false],
    [':smile', false],
    ['smile:', false],
  ] as const)('isCustomEmoji("%s") is %o', ([input, expected], { expect }) => {
    expect(isCustomEmoji(input)).toBe(expected);
  });
});

describe('stringHasUnicodeFlags', () => {
  test.concurrent.for([
    ['EU 🇪🇺', true],
    ['Germany 🇩🇪', true],
    ['Canada 🇨🇦', true],
    ['São Tomé & Príncipe 🇸🇹', true],
    ['Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿', true],
    ['black flag 🏴', false],
    ['arrr 🏴‍☠️', false],
    ['rainbow flag 🏳️‍🌈', false],
    ['non-flag 🔥', false],
    ['only text', false],
  ] as const)(
    'stringHasFlags has flag in "%s": %o',
    ([text, expected], { expect }) => {
      expect(stringHasUnicodeFlags(text)).toBe(expected);
    },
  );
});
