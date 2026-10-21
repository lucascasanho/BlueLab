import { FormattedMessage } from 'react-intl';

import { NavLink } from 'react-router-dom';

import { BugReportLabel } from '@/mastodon/features/bug_report/bug_report_label';
import { useOpenBugReport } from '@/mastodon/features/bug_report/use_bug_report';
import {
  domain,
  profile_directory as canViewProfileDirectory,
  statusPageUrl,
  termsOfServiceEnabled,
  title,
} from '@/mastodon/initial_state';

import classes from '../../discovery_panel/footer_links.module.scss';

export const VanillaFooterLinks: React.FC<{
  context: 'navigation' | 'search';
  multiColumn?: boolean;
}> = ({ context, multiColumn }) => {
  const openBugReport = useOpenBugReport();
  const multiColumnLinkAttrs = multiColumn
    ? {
        target: '_blank',
      }
    : undefined;

  return (
    <div className={classes.root} data-context={context}>
      <section>
        <h2 className={classes.heading}>{title ?? domain}</h2>
        <ul className={classes.list}>
          <li>
            <NavLink to='/about' {...multiColumnLinkAttrs}>
              <FormattedMessage
                id='footer.about_this_server'
                defaultMessage='About'
              />
            </NavLink>
          </li>
          {termsOfServiceEnabled && (
            <li>
              <NavLink
                to='/terms-of-service'
                rel='terms-of-service'
                {...multiColumnLinkAttrs}
              >
                <FormattedMessage
                  id='footer.terms_of_service_short'
                  defaultMessage='Terms'
                />
              </NavLink>
            </li>
          )}
          <li>
            <NavLink
              to='/privacy-policy'
              rel='privacy-policy'
              {...multiColumnLinkAttrs}
            >
              <FormattedMessage
                id='footer.privacy_policy_short'
                defaultMessage='Privacy'
              />
            </NavLink>
          </li>
          {statusPageUrl && (
            <li>
              <a href={statusPageUrl} target='_blank' rel='noopener'>
                <FormattedMessage id='footer.status' defaultMessage='Status' />
              </a>
            </li>
          )}
          {canViewProfileDirectory && (
            <li>
              <NavLink to='/directory' {...multiColumnLinkAttrs}>
                <FormattedMessage
                  id='footer.directory_short'
                  defaultMessage='Directory'
                />
              </NavLink>
            </li>
          )}
          <li>
            <button
              type='button'
              className={classes.bugReportButton}
              onClick={openBugReport}
            >
              <BugReportLabel />
            </button>
          </li>
        </ul>
      </section>
    </div>
  );
};
