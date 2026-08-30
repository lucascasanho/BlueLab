import { useCallback } from 'react';

import { useIntl, defineMessages } from 'react-intl';

import { Link } from 'react-router-dom';

import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import { cancelReplyCompose } from 'mastodon/actions/compose';
import { Account } from 'mastodon/components/account';
import { IconButton } from 'mastodon/components/icon_button';
import { ShortNumber } from 'mastodon/components/short_number';
import { me } from 'mastodon/initial_state';
import { useAppDispatch, useAppSelector } from 'mastodon/store';

const messages = defineMessages({
  cancel: { id: 'reply_indicator.cancel', defaultMessage: 'Cancel' },
  posts: { id: 'account.posts', defaultMessage: 'Posts' },
  following: { id: 'account.following', defaultMessage: 'Following' },
  followers: { id: 'account.followers', defaultMessage: 'Followers' },
});

export const accountStatPaths = (acct: string) => ({
  posts: `/@${acct}`,
  following: `/@${acct}/following`,
  followers: `/@${acct}/followers`,
});

export const NavigationBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const isReplying = useAppSelector(
    (state) => !!state.compose.get('in_reply_to'),
  );
  const account = useAppSelector((state) =>
    me ? state.accounts.get(me) : undefined,
  );
  const paths = account ? accountStatPaths(account.acct) : accountStatPaths('');
  const stats = account
    ? [
        {
          key: 'posts',
          value: account.statuses_count,
          label: messages.posts,
          path: paths.posts,
        },
        {
          key: 'following',
          value: account.following_count,
          label: messages.following,
          path: paths.following,
        },
        {
          key: 'followers',
          value: account.followers_count,
          label: messages.followers,
          path: paths.followers,
        },
      ]
    : [];
  const postsStat = stats[0];

  const handleCancelClick = useCallback(() => {
    dispatch(cancelReplyCompose());
  }, [dispatch]);

  if (!me) {
    return null;
  }

  return (
    <div className='navigation-bar'>
      <div className='navigation-bar__account-card'>
        <Account id={me} minimal />
        {account && postsStat && (
          <div className='navigation-bar__account-stats'>
            <Link
              to={postsStat.path}
              className='navigation-bar__account-stat navigation-bar__account-stat--posts'
              title={intl.formatNumber(postsStat.value)}
              aria-label={`${intl.formatNumber(postsStat.value)} ${intl.formatMessage(postsStat.label)}`}
            >
              <strong>
                <ShortNumber value={postsStat.value} />
              </strong>{' '}
              {intl.formatMessage(postsStat.label)}
            </Link>
            <div className='navigation-bar__account-social-stats'>
              {stats.slice(1).map(({ key, value, label, path }) => (
                <Link
                  key={key}
                  to={path}
                  className={`navigation-bar__account-stat navigation-bar__account-stat--${key}`}
                  title={intl.formatNumber(value)}
                  aria-label={`${intl.formatNumber(value)} ${intl.formatMessage(label)}`}
                >
                  <strong>
                    <ShortNumber value={value} />
                  </strong>{' '}
                  {intl.formatMessage(label)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {isReplying && (
        <IconButton
          title={intl.formatMessage(messages.cancel)}
          icon=''
          iconComponent={CloseIcon}
          onClick={handleCancelClick}
        />
      )}
    </div>
  );
};
