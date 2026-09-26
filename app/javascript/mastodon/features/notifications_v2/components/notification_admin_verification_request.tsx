import { FormattedMessage } from 'react-intl';

import classNames from 'classnames';

import { DisplayName } from '@/mastodon/components/display_name';
import ShieldQuestionIcon from '@/material-icons/400-24px/shield_question.svg?react';
import { Icon } from 'mastodon/components/icon';
import { RelativeTimestamp } from 'mastodon/components/relative_timestamp';

import type { NotificationGroupAdminVerificationRequest } from 'mastodon/models/notification_group';
import { useAppSelector } from 'mastodon/store';

export const NotificationAdminVerificationRequest: React.FC<{
  notification: NotificationGroupAdminVerificationRequest;
  unread?: boolean;
}> = ({ notification, unread }) => {
  const account = useAppSelector((state) =>
    state.accounts.get(notification.sampleAccountIds[0] ?? '0'),
  );

  if (!account) return null;

  return (
    <a
      href='/admin/verification_requests'
      className={classNames(
        'notification-group notification-group--link notification-group--admin-verification-request focusable',
        { 'notification-group--unread': unread },
      )}
    >
      <div className='notification-group__icon'>
        <Icon id='shield-question' icon={ShieldQuestionIcon} />
      </div>

      <div className='notification-group__main'>
        <div className='notification-group__main__header'>
          <h2 className='notification-group__main__header__label'>
            <FormattedMessage
              id='notification.admin.verification_request'
              defaultMessage='{name} requested a verification badge'
              values={{
                name: <DisplayName account={account} variant='simple' />,
              }}
            />
            <RelativeTimestamp
              timestamp={notification.latest_page_notification_at}
            />
          </h2>
        </div>
      </div>
    </a>
  );
};
