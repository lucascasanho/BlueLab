import type { ComponentPropsWithoutRef, FC } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import classNames from 'classnames';

import LockIcon from '@/material-icons/400-24px/lock.svg?react';

import { AnimateEmojiProvider } from '../emoji/context';
import { EmojiHTML } from '../emoji/html';
import { Icon } from '../icon';
import { Skeleton } from '../skeleton';

import type { DisplayNameProps } from './index';

const messages = defineMessages({
  locked: {
    id: 'account.locked_info',
    defaultMessage: 'This account manually reviews who can follow it.',
  },
});

export const DisplayNameWithoutDomain: FC<
  Omit<DisplayNameProps, 'variant'> & ComponentPropsWithoutRef<'span'>
> = ({ account, className, children, localDomain: _, ...props }) => {
  const intl = useIntl();

  return (
    <AnimateEmojiProvider
      {...props}
      as='span'
      className={classNames('display-name', className)}
    >
      <bdi className='display-name__name'>
        {account ? (
          <EmojiHTML
            className='display-name__html'
            htmlString={account.display_name_html}
            as='strong'
            extraEmojis={account.emojis}
          />
        ) : (
          <strong className='display-name__html'>
            <Skeleton width='10ch' />
          </strong>
        )}
        {account?.locked && (
          <span
            className='display-name__locked'
            title={intl.formatMessage(messages.locked)}
          >
            <Icon
              id='lock'
              icon={LockIcon}
              aria-label={intl.formatMessage(messages.locked)}
            />
          </span>
        )}
      </bdi>
      {children}
    </AnimateEmojiProvider>
  );
};
