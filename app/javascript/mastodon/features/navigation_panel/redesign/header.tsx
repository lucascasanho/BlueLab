import { FormattedMessage, useIntl } from 'react-intl';

import { Link } from 'react-router-dom';

import { IconLogo } from '@/mastodon/components/logo';
import { blue2Text } from '@/mastodon/features/blue2/locale';
import { customAppIcon, domain, title } from '@/mastodon/initial_state';

import classes from './header.module.scss';

export const NavigationHeader: React.FC<{
  siteName?: string;
  isStuck: boolean;
}> = ({ siteName, isStuck }) => {
  const intl = useIntl();
  const isBlue2 =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';

  return (
    <header className={classes.root} data-stuck={isStuck}>
      <Link to='/' className={classes.siteNameLink}>
        {customAppIcon && (
          <img src={customAppIcon} alt='' className={classes.appIcon} />
        )}
        <span className={classes.content}>
          <span className={classes.serverName}>
            {siteName ?? title ?? domain}
          </span>
          <span className={classes.poweredBy}>
            {isBlue2 ? (
              <>
                {blue2Text(intl.locale, 'basedOnMastodon')}{' '}
                <IconLogo role='presentation' />
              </>
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
