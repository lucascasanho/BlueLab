import { FormattedMessage } from 'react-intl';

import { Link } from 'react-router-dom';

import InstanceLogo from '@/images/logo-symbol-icon.svg?react';
import { IconLogo } from '@/mastodon/components/logo';
import {
  customAppIcon,
  customInstanceLogo,
  domain,
  title,
} from '@/mastodon/initial_state';

import classes from './header.module.scss';

export const NavigationHeader: React.FC<{
  siteName?: string;
  isStuck: boolean;
}> = ({ siteName, isStuck }) => {
  return (
    <header className={classes.root} data-stuck={isStuck}>
      <Link to='/' className={classes.siteNameLink}>
        {customInstanceLogo ? (
          <img src={customInstanceLogo} alt='' className={classes.appIcon} />
        ) : customAppIcon ? (
          <img src={customAppIcon} alt='' className={classes.appIcon} />
        ) : (
          <InstanceLogo className={classes.appIcon} aria-hidden='true' />
        )}
        <span className={classes.content}>
          <span className={classes.serverName}>
            {siteName ?? title ?? domain}
          </span>
          <span className={classes.poweredBy}>
            <FormattedMessage
              id='navigation_bar.powered_by_mastodon'
              defaultMessage='powered by {logo}Mastodon'
              values={{
                logo: <IconLogo role='presentation' />,
              }}
            />
          </span>
        </span>
      </Link>
    </header>
  );
};
