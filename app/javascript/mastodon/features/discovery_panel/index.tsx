import { useRouteMatch } from 'react-router';

import { Search } from '@/mastodon/features/compose/components/search';
import { useIdentity } from '@/mastodon/identity_context';

import { VanillaFooterLinks } from '@/mastodon/features/navigation_panel/redesign/vanilla_footer_links';

import { FooterLinks } from './footer_links';
import classes from './styles.module.scss';

/**
 * Don't display the search on editing flows and the search/explore
 * pages that have their own search field.
 */
const ROUTES_WITHOUT_SEARCH_BAR = [
  '/explore',
  '/explore/tags',
  '/explore/suggestions',
  '/explore/links',
  '/search',
  '/start',
  '/start/profile',
  '/profile/edit',
  '/lists/new',
  '/lists/:id/edit',
  '/collections/new',
  '/collections/:id/edit',
  '/collections/:id/edit/details',
];

export const DiscoveryPanel: React.FC = () => {
  const { signedIn } = useIdentity();
  const isVanillaTheme =
    typeof document !== 'undefined' &&
    document.body.dataset.theme === 'default';

  const isRouteWithSearchBar = !useRouteMatch({
    path: ROUTES_WITHOUT_SEARCH_BAR,
    exact: true,
  });

  return (
    <div className={classes.root}>
      {signedIn && isRouteWithSearchBar && (
        <Search singleColumn context='sidebar' />
      )}

      <footer className={classes.footer}>
        {isVanillaTheme ? (
          <VanillaFooterLinks context='search' />
        ) : (
          <FooterLinks context='search' />
        )}
      </footer>
    </div>
  );
};
