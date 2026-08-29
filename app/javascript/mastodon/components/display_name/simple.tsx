import type { ComponentPropsWithoutRef, FC } from 'react';

import { EmojiHTML } from '../emoji/html';

import type { DisplayNameProps } from './index';
import { AccountLock } from './lock';

export const DisplayNameSimple: FC<
  Omit<DisplayNameProps, 'variant'> & ComponentPropsWithoutRef<'span'>
> = ({ account, localDomain: _, ...props }) => {
  if (!account) {
    return null;
  }

  return (
    <bdi className='display-name__name'>
      <EmojiHTML
        {...props}
        as='span'
        htmlString={account.display_name_html}
        extraEmojis={account.emojis}
      />
      {account.locked && <AccountLock />}
    </bdi>
  );
};
