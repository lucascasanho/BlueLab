import type { FC } from 'react';

import { FormattedMessage } from 'react-intl';

import type { NavLinkProps } from 'react-router-dom';

import { useAccount } from '@/mastodon/hooks/useAccount';
import { useAccountId } from '@/mastodon/hooks/useAccountId';
import { me } from '@/mastodon/initial_state';

import { TabLink, TabList } from '../tab_list';

import classes from './styles.module.scss';

const isActive: Required<NavLinkProps>['isActive'] = (match, location) =>
  match?.url === location.pathname ||
  (!!match?.url && location.pathname.startsWith(`${match.url}/tagged/`));

export const AccountTabs: FC = () => {
  const accountId = useAccountId();
  const account = useAccount(accountId);

  if (!account) {
    return <hr className={classes.noTabs} />;
  }

  const { acct, show_featured, show_media } = account;
  const isMe = account.id === me;
  if (!isMe && !show_featured && !show_media) {
    return <hr className={classes.noTabs} />;
  }

  const isBlue2 =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';

  return (
    <TabList data-blue2-profile-tabs={isBlue2 ? 'true' : undefined}>
      <TabLink isActive={isActive} to={`/@${acct}`}>
        <FormattedMessage id='account.activity' defaultMessage='Activity' />
      </TabLink>
      {(show_media || isMe) && (
        <TabLink exact to={`/@${acct}/media`}>
          <FormattedMessage id='account.media' defaultMessage='Media' />
        </TabLink>
      )}
      {(show_featured || isMe) && (
        <TabLink exact to={`/@${acct}/featured`}>
          <FormattedMessage id='account.featured' defaultMessage='Featured' />
        </TabLink>
      )}
    </TabList>
  );
};
