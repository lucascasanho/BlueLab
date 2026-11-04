import { lazy, Suspense } from 'react';

import { LoadingIndicator } from '@/mastodon/components/loading_indicator';
import { isRedesignStatusEnabled } from '@/mastodon/utils/environment';

const LazyStatusRedesign = lazy(() =>
  import('./redesign').then(({ StatusPage }) => ({ default: StatusPage })),
);
const LazyStatusLegacy = lazy(() => import('./legacy'));

const StatusPage = (props: Record<string, unknown>) => {
  const theme =
    typeof document !== 'undefined' ? document.body.dataset.theme : undefined;
  const useVanillaStatusRedesign =
    !theme || theme === 'default' || theme === 'vanilla';

  return (
    <Suspense fallback={<LoadingIndicator />}>
      {useVanillaStatusRedesign || isRedesignStatusEnabled() ? (
        <LazyStatusRedesign />
      ) : (
        <LazyStatusLegacy {...props} />
      )}
    </Suspense>
  );
};

// eslint-disable-next-line import/no-default-export
export default StatusPage;
