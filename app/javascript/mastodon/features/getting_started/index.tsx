import { useIntl } from 'react-intl';

import { Helmet } from '@unhead/react/helmet';

import { Column } from '@/mastodon/components/column';

import { NavigationPanel } from '../navigation_panel';
import { NavigationFooterLinks } from '../navigation_panel/redesign/footer_links';

const GettingStarted: React.FC = () => {
  const intl = useIntl();
  const isBlueLabTheme =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';

  return (
    <Column>
      <NavigationPanel multiColumn />

      {isBlueLabTheme && (
        <div className='bluelab-advanced-footer-spacer' aria-hidden='true' />
      )}

      <NavigationFooterLinks multiColumn variant='blue2' />

      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'getting_started.heading',
            defaultMessage: 'Getting started',
          })}
        </title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default GettingStarted;
