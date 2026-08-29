import { useCallback } from 'react';

import { useIntl, defineMessages } from 'react-intl';

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

export const NavigationBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const isReplying = useAppSelector(
    (state) => !!state.compose.get('in_reply_to'),
  );
  const account = useAppSelector((state) =>
    me ? state.accounts.get(me) : undefined,
  );
  const stats = account
    ? [
        { key: 'posts', value: account.statuses_count, label: messages.posts },
        {
          key: 'following',
          value: account.following_count,
          label: messages.following,
        },
        {
          key: 'followers',
          value: account.followers_count,
          label: messages.followers,
        },
      ]
    : [];

  const handleCancelClick = useCallback(() => {
    dispatch(cancelReplyCompose());
  }, [dispatch]);

  if (!me) {
    return null;
  }

  return (
    <div className='navigation-bar'>
      <Account id={me} minimal />
      {account && (
        <div className='navigation-bar__account-stats'>
          {stats.map(({ key, value, label }) => (
            <span
              key={key}
              title={intl.formatNumber(value)}
              aria-label={`${intl.formatNumber(value)} ${intl.formatMessage(label)}`}
            >
              <strong>
                <ShortNumber value={value} />
              </strong>{' '}
              {intl.formatMessage(label)}
            </span>
          ))}
        </div>
      )}

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
