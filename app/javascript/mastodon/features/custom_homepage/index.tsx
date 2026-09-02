import { useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import { Route, Switch, useRouteMatch } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { NavigationFocusTarget } from '@/mastodon/components/navigation_focus_target';
import { blue2Text } from '@/mastodon/features/blue2/locale';
import { customAppIcon } from '@/mastodon/initial_state';
import { fetchServer } from 'mastodon/actions/server';
import { ServerHeroImage } from 'mastodon/components/server_hero_image';
import { TabLink, TabList } from 'mastodon/components/tab_list';
import { useAppSelector, useAppDispatch } from 'mastodon/store';

import { About } from './about';
import { LatestActivity } from './latest_activity';
import classes from './styles.module.scss';

export const CustomHomepage: React.FC = () => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const server = useAppSelector((state) => state.server.server);
  const { path } = useRouteMatch();
  const isBlue2 =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';
  const [showBlue2Welcome, setShowBlue2Welcome] = useState(isBlue2);

  useEffect(() => {
    void dispatch(fetchServer());
  }, [dispatch]);

  if (isBlue2) {
    return (
      <div className={classes.blue2AboutPage}>
        <ServerHeroImage
          alt={server.item?.thumbnail.description ?? ''}
          blurhash={server.item?.thumbnail.blurhash ?? ''}
          src={server.item?.thumbnail.url ?? ''}
          srcSet={Object.keys(server.item?.thumbnail.versions ?? {})
            .map(
              (key) =>
                `${server.item?.thumbnail.versions?.[key]} ${key.replace('@', '')}`,
            )
            .join(', ')}
          className={classes.blue2AboutHeader}
        />

        <div className={classes.blue2AboutIdentity}>
          <img
            src={customAppIcon ?? '/favicon.ico'}
            alt=''
            className={classes.blue2LandingIcon}
          />
          <div>
            <NavigationFocusTarget as='h1'>
              {server.item?.domain}
            </NavigationFocusTarget>
            <p>{server.item?.description}</p>
          </div>
        </div>

        <About />

        {showBlue2Welcome && (
          <div className={classes.blue2WelcomeBackdrop}>
            <section
              className={classes.blue2WelcomeDialog}
              role='dialog'
              aria-modal='true'
              aria-labelledby='blue2-welcome-title'
            >
              <button
                className={classes.blue2WelcomeClose}
                type='button'
                onClick={() => setShowBlue2Welcome(false)}
                aria-label={intl.formatMessage({
                  id: 'bundle_modal_error.close',
                  defaultMessage: 'Close',
                })}
              >
                ×
              </button>

              <img
                src={customAppIcon ?? '/favicon.ico'}
                alt=''
                className={classes.blue2WelcomeIcon}
              />

              <h2 id='blue2-welcome-title'>{server.item?.domain}</h2>
              <p>{server.item?.description}</p>

              <div className={classes.blue2WelcomeActions}>
                <a href='/auth/sign_up' className={classes.blue2PrimaryAction}>
                  <FormattedMessage id='auth.register' defaultMessage='Create account' />
                </a>
                <button
                  type='button'
                  className={classes.blue2ExploreAction}
                  onClick={() => setShowBlue2Welcome(false)}
                >
                  <FormattedMessage id='tabs_bar.explore' defaultMessage='Explore' />
                </button>
              </div>

              <div className={classes.blue2WelcomeLogin}>
                <span>{blue2Text(intl.locale, 'haveAccount')}</span>{' '}
                <a href='/auth/sign_in'>
                  <FormattedMessage id='auth.login' defaultMessage='Log in' />
                </a>
              </div>
            </section>
          </div>
        )}

        <Helmet>
          <title>{server.item?.domain}</title>
          <meta name='robots' content='all' />
        </Helmet>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <ServerHeroImage
        alt={server.item?.thumbnail.description ?? ''}
        blurhash={server.item?.thumbnail.blurhash ?? ''}
        src={server.item?.thumbnail.url ?? ''}
        srcSet={Object.keys(server.item?.thumbnail.versions ?? {})
          .map(
            (key) =>
              `${server.item?.thumbnail.versions?.[key]} ${key.replace('@', '')}`,
          )
          .join(', ')}
        className={classes.header}
      />

      <div className={classes.topSection}>
        <NavigationFocusTarget as='h1'>
          {server.item?.domain}
        </NavigationFocusTarget>
        <p>{server.item?.description}</p>
      </div>

      <TabList>
        <TabLink to={path} exact>
          <FormattedMessage
            id='custom_homepage.latest_activity'
            defaultMessage='Latest activity'
          />
        </TabLink>

        <TabLink to={`${path}/about`} exact>
          <FormattedMessage id='custom_homepage.about' defaultMessage='About' />
        </TabLink>
      </TabList>

      <Switch>
        <Route path={path} exact component={LatestActivity} />
        <Route path={`${path}/about`} exact component={About} />
      </Switch>

      <Helmet>
        <title>{server.item?.domain}</title>
        <meta name='robots' content='all' />
      </Helmet>
    </div>
  );
};
