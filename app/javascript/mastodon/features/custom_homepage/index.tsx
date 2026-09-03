import { useCallback, useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import { Route, Switch, useLocation, useRouteMatch } from 'react-router-dom';

import * as WebAuthnJSON from '@github/webauthn-json';
import { Helmet } from '@unhead/react/helmet';

import api from '@/mastodon/api';
import { NavigationFocusTarget } from '@/mastodon/components/navigation_focus_target';
import { customAppIcon, registrationsOpen } from '@/mastodon/initial_state';
import { fetchServer } from 'mastodon/actions/server';
import { ServerHeroImage } from 'mastodon/components/server_hero_image';
import { TabLink, TabList } from 'mastodon/components/tab_list';
import { useIdentity } from 'mastodon/identity_context';
import { useAppSelector, useAppDispatch } from 'mastodon/store';

import { About } from './about';
import { LatestActivity } from './latest_activity';
import classes from './styles.module.scss';

export const CustomHomepage: React.FC = () => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const server = useAppSelector((state) => state.server.server);
  const signupUrl = useAppSelector(
    (state) => state.server.server.item?.registrations.url ?? '/auth/sign_up',
  );
  const { signedIn } = useIdentity();
  const { path } = useRouteMatch();
  const { pathname } = useLocation();
  const isAboutRoute = pathname === `${path}/about`;
  const isBlue2 =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';
  const [showBlue2Welcome, setShowBlue2Welcome] = useState(
    isBlue2 && !signedIn,
  );

  useEffect(() => {
    void dispatch(fetchServer());
  }, [dispatch]);

  const closeBlue2Welcome = useCallback(() => {
    setShowBlue2Welcome(false);
  }, []);

  const handlePasskeyLogin = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!WebAuthnJSON.supported()) {
      window.location.assign('/auth/sign_in#passkey-authentication-form');
      return;
    }

    const authenticate = async () => {
      try {
        const response = await api().get<
          WebAuthnJSON.CredentialRequestOptionsJSON['publicKey']
        >('/auth/passkey/options');
        const credential = await WebAuthnJSON.get({ publicKey: response.data });
        const result = await api().post<{ redirect_path: string }>(
          '/auth/passkey',
          { credential },
        );
        window.location.replace(result.data.redirect_path);
      } catch (error) {
        console.error('Passkey authentication failed', error);
        window.location.assign('/auth/sign_in#passkey-authentication-form');
      }
    };

    void authenticate();
  }, []);

  if (isBlue2 && isAboutRoute) {
    return (
      <div className={classes.blue2Landing}>
        <section className={classes.blue2LandingIntro}>
          <img
            src={customAppIcon ?? '/favicon.ico'}
            alt=''
            className={classes.blue2LandingIcon}
          />
          <NavigationFocusTarget as='h1'>
            {server.item?.domain}
          </NavigationFocusTarget>
          <p>{server.item?.description}</p>

          {!signedIn && (
            <div className={classes.blue2LandingActions}>
              {registrationsOpen && (
                <a href={signupUrl} className={classes.blue2PrimaryAction}>
                  <FormattedMessage
                    id='sign_in_banner.create_account'
                    defaultMessage='Create account'
                  />
                </a>
              )}

              <a href='/auth/sign_in' className={classes.blue2SecondaryAction}>
                <FormattedMessage id='auth.login' defaultMessage='Log in' />
              </a>

              <a
                href='/auth/sign_in#passkey-authentication-form'
                className={classes.blue2SecondaryAction}
                onClick={handlePasskeyLogin}
              >
                <FormattedMessage
                  id='passkeys.sign_in'
                  defaultMessage='Sign in with a passkey'
                />
              </a>
            </div>
          )}
        </section>

        <section className={classes.blue2LandingAbout}>
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
            className={classes.blue2LandingHeader}
          />
          <About />
        </section>

        {showBlue2Welcome && !signedIn && (
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
                onClick={closeBlue2Welcome}
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
                {registrationsOpen && (
                  <a
                    href={signupUrl}
                    className={classes.blue2ModalPrimaryAction}
                  >
                    <FormattedMessage
                      id='sign_in_banner.create_account'
                      defaultMessage='Create account'
                    />
                  </a>
                )}

                <a
                  href='/auth/sign_in'
                  className={classes.blue2ModalSecondaryAction}
                >
                  <FormattedMessage
                    id='sign_in_banner.sign_in'
                    defaultMessage='Login'
                  />
                </a>

                <a
                  href='/auth/sign_in#passkey-authentication-form'
                  className={classes.blue2ModalSecondaryAction}
                  onClick={handlePasskeyLogin}
                >
                  <FormattedMessage
                    id='passkeys.sign_in'
                    defaultMessage='Sign in with a passkey'
                  />
                </a>

                <button
                  type='button'
                  className={classes.blue2ExploreAction}
                  onClick={closeBlue2Welcome}
                >
                  <FormattedMessage
                    id='tabs_bar.explore'
                    defaultMessage='Explore'
                  />
                </button>
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

        {!isBlue2 && !signedIn && (
          <div className={classes.guestActions}>
            {registrationsOpen && (
              <a href={signupUrl} className='button'>
                <FormattedMessage
                  id='sign_in_banner.create_account'
                  defaultMessage='Create account'
                />
              </a>
            )}

            <a href='/auth/sign_in' className='button button-secondary'>
              <FormattedMessage
                id='sign_in_banner.sign_in'
                defaultMessage='Login'
              />
            </a>

            <a
              href='/auth/sign_in#passkey-authentication-form'
              className='button button-secondary'
              onClick={handlePasskeyLogin}
            >
              <FormattedMessage
                id='passkeys.sign_in'
                defaultMessage='Sign in with a passkey'
              />
            </a>
          </div>
        )}
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
