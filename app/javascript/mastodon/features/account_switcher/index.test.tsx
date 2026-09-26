import {
  readStoredAccounts,
  removeStoredAccount,
  upsertStoredAccount,
  type StoredAccount,
} from './index';

const account = (id: string, lastUsedAt = 0): StoredAccount => ({
  id,
  acct: id + '@example.social',
  username: id,
  displayName: id.toUpperCase(),
  avatar: 'https://example.social/avatars/' + id + '.png',
  url: 'https://example.social/@' + id,
  sessionId: 'session-' + id,
  lastUsedAt,
  emojis: [
    {
      shortcode: 'test_custom',
      static_url: 'https://example.social/emoji/test_custom.png',
      url: 'https://example.social/emoji/test_custom.gif',
      category: '',
      featured: false,
        visible_in_picker: true,
    },
  ],
  instanceVerification: {
    issuer: 'Mastodon Blue',
    issuer_domain: 'mastodon.blue',
    verified_at: '2026-09-25T12:00:00.000Z',
    badge: {
      view_box: '0 0 24 24',
      path: 'M1 1L23 23Z',
      colors: ['#60a5fa', '#1d9bf0', '#1d4ed8'],
    },
  },
});

describe('account switcher storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores accounts independently and puts the most recently used first', () => {
    const first = upsertStoredAccount(account('alice'), 100);
    expect(first.map((item) => item.id)).toEqual(['alice']);

    const second = upsertStoredAccount(account('bob'), 200);
    expect(second.map((item) => item.id)).toEqual(['bob', 'alice']);

    const refreshed = upsertStoredAccount(
      { ...account('alice'), sessionId: 'session-alice-new' },
      300,
    );

    expect(refreshed.map((item) => item.id)).toEqual(['alice', 'bob']);
    expect(readStoredAccounts()[0].sessionId).toBe('session-alice-new');
    expect(readStoredAccounts()[0].emojis?.[0]).toMatchObject({
      shortcode: 'test_custom',
      static_url: 'https://example.social/emoji/test_custom.png',
      url: 'https://example.social/emoji/test_custom.gif',
    });
    expect(readStoredAccounts()[0].instanceVerification?.badge).toEqual({
      view_box: '0 0 24 24',
      path: 'M1 1L23 23Z',
      colors: ['#60a5fa', '#1d9bf0', '#1d4ed8'],
    });
  });

  it('keeps the browser vault within the default ten-session server capacity', () => {
    for (let index = 0; index < 12; index += 1) {
      upsertStoredAccount(account('account-' + index), index);
    }

    const stored = readStoredAccounts();
    expect(stored).toHaveLength(10);
    expect(stored[0].id).toBe('account-11');
    expect(stored.at(-1)?.id).toBe('account-2');
  });

  it('removes only the selected saved account', () => {
    upsertStoredAccount(account('alice'), 100);
    upsertStoredAccount(account('bob'), 200);

    const remaining = removeStoredAccount('alice');

    expect(remaining.map((item) => item.id)).toEqual(['bob']);
  });
});
