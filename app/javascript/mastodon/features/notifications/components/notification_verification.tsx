import { FormattedMessage } from 'react-intl';

import classNames from 'classnames';

import { VerifiedMark } from '@/mastodon/components/display_name/verified_badge';
import { RelativeTimestamp } from '@/mastodon/components/relative_timestamp';

import type { NotificationGroupVerification } from 'mastodon/models/notification_group';

import classes from './notification_verification.module.scss';

export const NotificationVerification: React.FC<{
  notification: NotificationGroupVerification;
  unread?: boolean;
}> = ({ notification, unread = false }) => {
  const approved = notification.type === 'verification_approved';

  return (
    <div
      className={classNames(
        'notification-group focusable',
        classes.card,
        'notification-group--verification',
        { 'notification-group--unread': unread, [classes.unread]: unread },
      )}
      tabIndex={0}
      role='status'
    >
      <VerifiedMark className={classes.icon} />

      <div className={classes.content}>
        <p className={classes.message}>
          {approved ? (
            <FormattedMessage
              id='notification.verification.approved'
              defaultMessage='Your account has received verification from the moderation team.'
            />
          ) : (
            <FormattedMessage
              id='notification.verification.request'
              defaultMessage='Your account is being reviewed by the moderation team for verification.'
            />
          )}
        </p>

        <RelativeTimestamp
          timestamp={notification.latest_page_notification_at}
          className={classes.timestamp}
        />
      </div>
    </div>
  );
};
