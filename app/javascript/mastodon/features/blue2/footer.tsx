import { FormattedMessage } from 'react-intl';

import { Link } from 'react-router-dom';

import classes from './footer.module.scss';

export const Blue2FooterLinks: React.FC = () => (
  <footer className={classes.root}>
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
  </footer>
);
