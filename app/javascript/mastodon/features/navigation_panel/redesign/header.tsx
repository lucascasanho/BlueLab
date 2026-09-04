import { FormattedMessage, useIntl } from 'react-intl';

import { Link } from 'react-router-dom';

import InstanceLogo from '@/images/logo-symbol-icon.svg?react';
import { IconLogo } from '@/mastodon/components/logo';
import { blue2Text } from '@/mastodon/features/blue2/locale';
import {
  customAppIcon,
  customFavicon,
  customInstanceLogo,
  domain,
  title,
} from '@/mastodon/initial_state';

import classes from './header.module.scss';

export const NavigationHeader: React.FC<{
  siteName?: string;
  isStuck: boolean;
}> = ({ siteName, isStuck }) => {
  const intl = useIntl();
  const isBlue2 =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';
  const blue2Brand = customInstanceLogo ?? customFavicon ?? '/favicon.ico';

  return (
    <header className={classes.root} data-stuck={isStuck}>
      <Link to='/' className={classes.siteNameLink}>
        {isBlue2 ? (
          <img src={blue2Brand} alt='' className={classes.appIcon} />
        ) : customInstanceLogo ? (
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
            {isBlue2 ? (
              <>{blue2Text(intl.locale, 'basedOnMastodon')}</>
            ) : (
              <FormattedMessage
                id='navigation_bar.powered_by_mastodon'
                defaultMessage='powered by {logo}Mastodon'
                values={{
                  logo: <IconLogo role='presentation' />,
                }}
              />
            )}
          </span>
        </span>
      </Link>
    </header>
  );
};
