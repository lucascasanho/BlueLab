import { FormattedMessage } from 'react-intl';

import classNames from 'classnames';

import BugReportIcon from '@/material-icons/400-24px/bug_report.svg?react';
import { Icon } from 'mastodon/components/icon';
import { RelativeTimestamp } from 'mastodon/components/relative_timestamp';
import type {
  NotificationGroupAdminBugReport,
} from 'mastodon/models/notification_group';

export const NotificationAdminBugReport: React.FC<{
  notification: NotificationGroupAdminBugReport;
  unread?: boolean;
}> = ({ notification, unread }) => (
  <a
    href={`/admin/bug_reports/${notification.bugReportId}`}
    target='_blank'
    rel='noopener noreferrer'
    className={classNames(
      'notification-group notification-group--link notification-group--admin-bug-report focusable',
      { 'notification-group--unread': unread },
    )}
  >
    <div className='notification-group__icon'>
      <Icon id='bug-report' icon={BugReportIcon} />
    </div>

    <div className='notification-group__main'>
      <div className='notification-group__main__header'>
        <h2 className='notification-group__main__header__label'>
          <FormattedMessage
            id='notification.admin.bug_report'
            defaultMessage='A new bug report was submitted'
          />
          <RelativeTimestamp
            timestamp={notification.latest_page_notification_at}
          />
        </h2>
      </div>
    </div>
  </a>
);
