import type { Account } from '@/mastodon/models/account';

export const titleFromAccount = (
  account: Account,
  localDomain: string | undefined,
) => {
  const displayName = account.emojis
    .reduce(
      (name, emoji) => name.replaceAll(`:${emoji.shortcode}:`, ''),
      account.display_name,
    )
    .replaceAll(/\s+/g, ' ')
    .trim();
  const acct =
    account.acct === account.username
      ? `${account.username}@${localDomain ?? new URL(account.url).host}`
      : account.acct;
  const prefix = displayName.length === 0 ? account.username : displayName;

  return `${prefix} (@${acct})`;
};
