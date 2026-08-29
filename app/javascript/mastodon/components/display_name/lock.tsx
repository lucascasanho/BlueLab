import type { FC } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import LockIcon from '@/material-icons/400-24px/lock.svg?react';

import { Icon } from '../icon';

const messages = defineMessages({
  locked: {
    id: 'account.locked_info',
    defaultMessage: 'This account manually reviews who can follow it.',
  },
});

export const AccountLock: FC = () => {
  const intl = useIntl();
  const label = intl.formatMessage(messages.locked);

  return (
    <span className='display-name__locked' title={label}>
      <Icon id='lock' icon={LockIcon} aria-label={label} />
    </span>
  );
};
