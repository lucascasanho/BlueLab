import { FormattedMessage } from 'react-intl';

import { Link } from 'react-router-dom';

import { domain, version } from 'mastodon/initial_state';

import classes from './link_footer.module.scss';

export const LinkFooter: React.FC<{
  context?: 'default' | 'multi-column' | 'about';
}> = ({ context = 'default' }) => {
  const multiColumn = context === 'multi-column';
  const displayVersion = version?.match(/^\d+\.\d+\.\d+/)?.[0] ?? version ?? '';

  return (
    <footer className={classes.wrapper} data-context={context}>
      <section>
        <ul className={classes.list}>
          <li>
            <span className={classes.instanceName}>{domain}</span>
          </li>
          <li>
            <Link to='/about' target={multiColumn ? '_blank' : undefined}>
              <FormattedMessage
                id='footer.about_this_server'
                defaultMessage='About'
              />
            </Link>
          </li>
          <li>
            <Link
              to='/privacy-policy'
              target={multiColumn ? '_blank' : undefined}
              rel='privacy-policy'
            >
              <FormattedMessage
                id='footer.activity_policy'
                defaultMessage='Activity policy'
              />
            </Link>
          </li>
          <li>
            <a
              href='https://joinmastodon.org/apps'
              target='_blank'
              rel='noopener'
            >
              <FormattedMessage
                id='footer.get_app'
                defaultMessage='Get the app'
              />
            </a>
          </li>
          <li>
            <Link to='/keyboard-shortcuts'>
              <FormattedMessage
                id='footer.keyboard_shortcuts'
                defaultMessage='Keyboard shortcuts'
              />
            </Link>
          </li>
          <li>
            <a
              href='https://github.com/MastodonBlue/BlueLab'
              rel='noopener'
              target='_blank'
            >
              <FormattedMessage
                id='footer.source_code'
                defaultMessage='View source code'
              />
            </a>
          </li>
          <li className={classes.version}>
            <FormattedMessage
              id='footer.bluelab_version'
              defaultMessage='Mastodon v{version} BlueLab'
              values={{ version: displayVersion }}
            />
          </li>
        </ul>
      </section>
    </footer>
  );
};
