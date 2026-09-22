import { FormattedMessage } from 'react-intl';

import classNames from 'classnames';
import { NavLink } from 'react-router-dom';

import { domain, termsOfServiceEnabled } from '@/mastodon/initial_state';

import classes from './footer_links.module.scss';

export const NavigationFooterLinks: React.FC<{
  siteName?: string;
  multiColumn?: boolean;
  variant?: 'default' | 'blue2';
}> = ({ siteName = domain, multiColumn, variant = 'default' }) => {
  const multiColumnLinkAttrs = multiColumn
    ? {
        target: '_blank',
      }
    : undefined;

  return (
    <div
      className={classNames(
        classes.root,
        variant === 'blue2' && classes.rootBlue2,
      )}
    >
      <h2 className={classes.heading}>{siteName}</h2>
      <ul className={classes.list}>
        <li>
          <NavLink to='/about' {...multiColumnLinkAttrs}>
            <FormattedMessage
              id='footer.about_this_server'
              defaultMessage='About'
            />
          </NavLink>
        </li>
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
      </ul>
    </div>
  );
};
