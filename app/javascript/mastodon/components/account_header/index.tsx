import { useCallback } from 'react';

import classNames from 'classnames';

import { Helmet } from '@unhead/react/helmet';

import { openModal } from '@/mastodon/actions/modal';
import {
  autoPlayGif,
  me,
  domain as localDomain,
} from '@/mastodon/initial_state';
import { getAccountHidden } from '@/mastodon/selectors/accounts';
import { useAppSelector, useAppDispatch } from '@/mastodon/store';

import { AccountBio } from '../account_bio';
import { Avatar } from '../avatar';
import { AnimateEmojiProvider } from '../emoji/context';
import { FamiliarFollowers } from '../familiar_followers';

import { AccountBadges } from './badges';
import { AccountBanners } from './banners';
import { AccountButtons } from './buttons';
import { AccountHeaderFields } from './fields';
import { AccountName } from './name';
import { AccountNote } from './note';
import { AccountNumberFields } from './number_fields';
import classes from './styles.module.scss';
import { AccountSubscriptionForm } from './subscription_form';
import { AccountTabs } from './tabs';
import { titleFromAccount } from './title';

export const AccountHeader: React.FC<{
  accountId: string;
  hideTabs?: boolean;
}> = ({ accountId, hideTabs }) => {
  const dispatch = useAppDispatch();
  const account = useAppSelector((state) => state.accounts.get(accountId));
  const hidden = useAppSelector((state) => getAccountHidden(state, accountId));

  const handleOpenAvatar = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey) {
        return;
      }

      e.preventDefault();

      if (!account) {
        return;
      }

      dispatch(
        openModal({
          modalType: 'IMAGE',
          modalProps: {
            src: account.avatar,
            alt: account.avatar_description,
          },
        }),
      );
    },
    [dispatch, account],
  );

  if (!account) {
    return null;
  }

  const suspendedOrHidden = hidden || account.suspended;
  const isLocal = !account.acct.includes('@');
  const isMe = me && account.id === me;
  const isBlue2 =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';

  return (
    <div className={isBlue2 ? 'blue2-profile' : undefined}>
      <AccountBanners account={account} />

      <AnimateEmojiProvider
        className={classNames(!!account.moved && classes.moved)}
      >
        <div
          className={classNames(
            classes.header,
            isBlue2 && 'blue2-profile-cover',
          )}
        >
          {!suspendedOrHidden && (
            <img
              src={autoPlayGif ? account.header : account.header_static}
              alt={account.header_description}
              className='parallax'
            />
          )}
        </div>

        <div
          className={classNames(
            classes.barWrapper,
            isBlue2 && 'blue2-profile-body',
          )}
        >
          <div
            className={classNames(
              classes.avatarWrapper,
              isBlue2 && 'blue2-profile-avatar',
            )}
          >
            <a
              href={account.avatar}
              rel='noopener'
              target='_blank'
              onClick={handleOpenAvatar}
            >
              <Avatar
                className={classes.avatar}
                account={suspendedOrHidden ? undefined : account}
                alt={account.avatar_description}
                size={isBlue2 ? 88 : 80}
              />
            </a>
          </div>

          <div
            className={classNames(
              classes.displayNameWrapper,
              isBlue2 && 'blue2-profile-identity-actions',
            )}
          >
            <AccountName accountId={accountId} />
            <AccountButtons
              accountId={accountId}
              className={classNames(
                classes.buttons,
                isBlue2 && 'blue2-profile-actions',
              )}
              noShare={!isMe || 'share' in navigator}
              forceMenu={'share' in navigator}
            />
          </div>

          <AccountBadges accountId={accountId} />

          {isBlue2 ? (
            <div className='blue2-profile-counts'>
              <AccountNumberFields accountId={accountId} />
            </div>
          ) : (
            <AccountNumberFields accountId={accountId} />
          )}

          {!isMe && !suspendedOrHidden && (
            <FamiliarFollowers
              accountId={accountId}
              className={classes.familiarFollowers}
            />
          )}

          {!suspendedOrHidden && (
            <div
              className={classNames(
                classes.bioButtonsWrapper,
                isBlue2 && 'blue2-profile-bio',
              )}
            >
              {me && account.id !== me && <AccountNote accountId={accountId} />}

              <AccountBio showDropdown accountId={accountId} />

              <AccountHeaderFields accountId={accountId} />

              {!me && account.email_subscriptions && (
                <AccountSubscriptionForm accountId={accountId} />
              )}
            </div>
          )}
        </div>
      </AnimateEmojiProvider>

      {!hideTabs && !hidden && <AccountTabs />}

      <Helmet>
        <title>{titleFromAccount(account, localDomain)}</title>
        <meta
          name='robots'
          content={isLocal && !account.noindex ? 'all' : 'noindex'}
        />
        <link rel='canonical' href={account.url} />
      </Helmet>
    </div>
  );
};
