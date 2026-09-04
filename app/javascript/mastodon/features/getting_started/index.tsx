import { useIntl } from 'react-intl';

import { Helmet } from '@unhead/react/helmet';

import { Column } from '@/mastodon/components/column';

import { NavigationPanel } from '../navigation_panel';
import { LinkFooter } from '../ui/components/link_footer';

const GettingStarted: React.FC = () => {
  const intl = useIntl();
  const isBlueLabTheme =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';
  const columnClassName = isBlueLabTheme
    ? 'bluelab-advanced-getting-started'
    : undefined;

  return (
    <Column className={columnClassName}>
      <NavigationPanel multiColumn />

      <LinkFooter context='multi-column' />

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
