import { useCallback, useState } from 'react';
import type { FC, MouseEventHandler } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { Link } from 'react-router-dom';

import type { Account, AccountShapeFull } from '@/mastodon/models/account';
import ChevronRightIcon from '@/material-icons/400-24px/chevron_right.svg?react';

import { Icon } from './icon';

const messages = defineMessages({
  show: {
    id: 'account_handle.show_full',
    defaultMessage: 'Show full username',
  },
  hide: {
    id: 'account_handle.hide_full',
    defaultMessage: 'Hide full username',
  },
});

type AccountLike = Account | AccountShapeFull;

export const AccountHandle: FC<{
  account?: AccountLike | null;
  localDomain?: string;
  linked?: boolean;
}> = ({ account, localDomain, linked = false }) => {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      // Account handles are also rendered inside links in timelines. Do not let
      // the enclosing link navigate away before the expanded state is updated.
      event.preventDefault();
      event.stopPropagation();
      setExpanded((value) => !value);
    },
    [],
  );

  if (!account || account.invalid_handle) return null;

  const fullAcct = account.acct.includes('@')
    ? account.acct
    : localDomain
      ? `${account.acct}@${localDomain}`
      : account.acct;
  const username = `@${account.username}`;
  const fullHandle = `@${fullAcct}`;
  const handle = expanded ? fullHandle : username;
  return (
    <span className='account-handle' title={fullHandle}>
      {linked ? (
        <Link to={`/@${account.acct}`} className='account-handle__link'>
          {handle}
        </Link>
      ) : (
        <span className='account-handle__text'>{handle}</span>
      )}
      <button
        type='button'
        className='account-handle__toggle'
        aria-expanded={expanded}
        aria-label={intl.formatMessage(
          expanded ? messages.hide : messages.show,
        )}
        onClick={toggleExpanded}
      >
        <Icon id='account-handle-toggle' icon={ChevronRightIcon} />
      </button>
    </span>
  );
};
