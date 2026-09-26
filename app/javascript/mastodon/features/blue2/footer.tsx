import { FormattedMessage } from 'react-intl';

import { Link } from 'react-router-dom';

import { BugReportLabel } from '@/mastodon/features/bug_report/bug_report_label';
import { useOpenBugReport } from '@/mastodon/features/bug_report/use_bug_report';

import classes from './footer.module.scss';

export const Blue2FooterLinks: React.FC = () => {
  const openBugReport = useOpenBugReport();

  return (
    <footer className={classes.root} data-bird-ui-footer='true'>
      <Link to='/about'>
        <FormattedMessage id='custom_homepage.about' defaultMessage='About' />
      </Link>
      <span>·</span>
      <Link to='/privacy-policy'>
        <FormattedMessage
          id='footer.privacy_policy_short'
          defaultMessage='Privacy'
        />
      </Link>
      <span>·</span>
      <Link to='/terms-of-service'>
        <FormattedMessage
          id='footer.terms_of_service_short'
          defaultMessage='Terms'
        />
      </Link>
      <span>·</span>
      <Link to='/keyboard-shortcuts'>
        <FormattedMessage
          id='keyboard_shortcuts.heading'
          defaultMessage='Keyboard Shortcuts'
        />
      </Link>
      <span>·</span>
      <button type='button' onClick={openBugReport}>
        <BugReportLabel />
      </button>
    </footer>
  );
};
