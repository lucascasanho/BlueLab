import { useCallback } from 'react';

import classNames from 'classnames';

import { Blue2RightRail } from '@/mastodon/features/blue2/right_rail';
import { Blue2ScrollToTop } from '@/mastodon/features/blue2/scroll_to_top';
import { ComposeRedesignButton } from '@/mastodon/features/compose/redesign/trigger';
import { ComposeRedesignButton as VanillaComposeRedesignButton } from '@/mastodon/features/compose/vanilla_redesign/trigger';
import { RedesignNavigationPanel as VanillaNavigationPanel } from '@/mastodon/features/navigation_panel/redesign/vanilla_navigation_panel';
import { RedesignMobileNavigation as VanillaMobileNavigation } from '@/mastodon/features/navigation_panel/redesign/vanilla_mobile_nav';
import { DiscoveryPanel } from '@/mastodon/features/discovery_panel';
import { Footer } from '@/mastodon/features/custom_homepage/components/footer';
import { CollapsibleNavigationPanel } from '@/mastodon/features/navigation_panel';
import { RedesignNavigationPanel } from '@/mastodon/features/navigation_panel/redesign';
import { RedesignMobileNavigation } from '@/mastodon/features/navigation_panel/redesign/mobile_nav';
import { useBreakpoint } from '@/mastodon/features/ui/hooks/useBreakpoint';
import { useColumnsContext } from '@/mastodon/features/ui/util/columns_context';
import { useAppSelector } from '@/mastodon/store';

import { ColumnsAreaMastodon5 } from '../../../mastodon5';
import {
  ComposePanel,
  RedirectToMobileComposeIfNeeded,
} from '../compose_panel';

import { MultiColumnContent } from './multi_column_content';
import { ColumnsAreaRedesign } from './redesign';
import classes from './styles.module.scss';
import multiColClasses from './styles_multi_column.module.scss';

const TabsBarPortal = () => {
  const { setTabsBarElement } = useColumnsContext();

  const setRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (element) {
        setTabsBarElement(element);
      }
    },
    [setTabsBarElement],
  );

  return <div id='tabs-bar__portal' ref={setRef} />;
};

interface ColumnsAreaProps {
  singleColumn?: boolean;
  minimalShell?: boolean;
  children: React.ReactElement | React.ReactElement[];
  ref?: React.Ref<HTMLDivElement>;
}

const ColumnsAreaLegacy: React.FC<ColumnsAreaProps> = ({
  children,
  minimalShell,
  singleColumn,
  ref,
}) => {
  const isMobileViewport = !useBreakpoint('full');
  const renderComposePanel = isMobileViewport;
  const useBlueLabComposer = useAppSelector(
    (state) => state.compose.get('composer_editor') !== 'mastodon',
  );
  const isBirdUi =
    typeof document !== 'undefined' &&
    document.body.dataset.theme === 'mastodon-bird-ui-auto';

  if (minimalShell) {
    return (
      <div ref={ref} className={classNames(classes.root, classes.rootMinimal)}>
        {isMobileViewport && <RedesignMobileNavigation />}
        <div className={classes.main}>
          <div>{children}</div>

          <Footer />
        </div>
      </div>
    );
  }

  if (singleColumn) {
    return (
      <div className='columns-area__panels'>
        <div className='columns-area__panels__pane columns-area__panels__pane--compositional'>
          <div className='columns-area__panels__pane__inner'>
            {renderComposePanel && (
              <ComposePanel showComposer={!useBlueLabComposer} />
            )}
            <RedirectToMobileComposeIfNeeded />
          </div>
        </div>
        {isMobileViewport ? (
          <RedesignMobileNavigation />
        ) : (
          <ComposeRedesignButton />
        )}

        {isBirdUi ? (
          <ComposeRedesignButton hostOnly />
        ) : (
          useBlueLabComposer && <ComposeRedesignButton />
        )}

        <main className='columns-area__panels__main'>
          <div className='tabs-bar__wrapper'>
            <TabsBarPortal />
          </div>

          <div className='columns-area columns-area--mobile'>{children}</div>
        </main>

        {isBirdUi && (
          <aside className='bird-ui-right-rail'>
            <Blue2RightRail variant='birdUi' />
          </aside>
        )}

        <CollapsibleNavigationPanel />
        {isBirdUi && <Blue2ScrollToTop />}
      </div>
    );
  }

  return (
    <main ref={ref} className={multiColClasses.root}>
      <div className={multiColClasses.navigationWrapper}>
        <RedesignNavigationPanel multiColumn />
      </div>
      <ComposeRedesignButton />
      <MultiColumnContent>{children}</MultiColumnContent>
      {/* Bird UI advanced interface intentionally has no scroll-to-top control. */}
    </main>
  );
};

const ColumnsAreaVanilla: React.FC<ColumnsAreaProps> = ({
  children,
  minimalShell,
  singleColumn,
  ref,
}) => {
  const isMobile = useBreakpoint('openable');

  if (minimalShell) {
    return (
      <div ref={ref} className={classNames(classes.root, classes.rootMinimal)}>
        {isMobile && <VanillaMobileNavigation />}
        <div className={classes.main}>
          <div>{children}</div>
          <Footer />
        </div>
      </div>
    );
  }

  if (singleColumn) {
    return (
      <div ref={ref} className={classes.root}>
        <div className={classes.navigationWrapper}>
          <VanillaNavigationPanel />
        </div>
        {isMobile ? <VanillaMobileNavigation /> : <VanillaComposeRedesignButton />}

        <main className={classes.main}>{children}</main>

        <div className={classes.discoveryWrapper}>
          <DiscoveryPanel />
        </div>
      </div>
    );
  }

  return (
    <main ref={ref} className={multiColClasses.root}>
      <div className={multiColClasses.navigationWrapper}>
        <VanillaNavigationPanel multiColumn />
      </div>
      <VanillaComposeRedesignButton />
      <MultiColumnContent>{children}</MultiColumnContent>
    </main>
  );
};

export const ColumnsArea: React.FC<ColumnsAreaProps> = (props) => {
  const theme =
    typeof document !== 'undefined' ? document.body.dataset.theme : undefined;

  if (theme === 'blue-2') {
    return <ColumnsAreaRedesign {...props} />;
  }

  if (theme === 'mastodon-5') {
    return <ColumnsAreaMastodon5 {...props} />;
  }

  if (theme === 'mastodon-bird-ui-auto') {
    return <ColumnsAreaLegacy {...props} />;
  }

  return <ColumnsAreaVanilla {...props} />;
};
