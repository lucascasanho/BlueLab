import type { ComponentPropsWithoutRef, FC } from 'react';

import type { LinkProps } from 'react-router-dom';
import { Link } from 'react-router-dom';

import type { Account, AccountShapeFull } from '@/mastodon/models/account';

import { AccountHandle } from '../account_handle';

import { DisplayNameDefault } from './default';
import { DisplayNameWithoutDomain } from './no-domain';
import { DisplayNameSimple } from './simple';

export interface DisplayNameProps {
  account?: Account | AccountShapeFull | null;
  localDomain?: string;
  variant?: 'default' | 'simple' | 'noDomain' | 'shortHandle';
}

export const DisplayName: FC<
  DisplayNameProps & ComponentPropsWithoutRef<'span'>
> = ({ variant = 'default', ...props }) => {
  if (variant === 'simple') {
    return <DisplayNameSimple {...props} />;
  } else if (variant === 'noDomain') {
    return <DisplayNameWithoutDomain {...props} />;
  } else if (variant === 'shortHandle') {
    return <DisplayNameDefault {...props} showDomain={false} />;
  }
  return <DisplayNameDefault {...props} />;
};

export const LinkedDisplayName: FC<
  Omit<LinkProps, 'to'> & {
    displayProps: DisplayNameProps & ComponentPropsWithoutRef<'span'>;
  }
> = ({ displayProps, children, ...linkProps }) => {
  const { account } = displayProps;
  if (!account) {
    return <DisplayName {...displayProps} />;
  }

  return (
    <span className='linked-display-name'>
      <Link
        to={`/@${account.acct}`}
        title={`@${account.acct}`}
        data-id={account.id}
        data-hover-card-account={account.id}
        {...linkProps}
      >
        {children}
        <DisplayName {...displayProps} variant='noDomain' />
      </Link>
      {displayProps.variant !== 'simple' && (
        <AccountHandle
          account={account}
          localDomain={displayProps.localDomain}
          linked
        />
      )}
    </span>
  );
};
