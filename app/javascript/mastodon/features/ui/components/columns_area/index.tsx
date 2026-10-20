import { useCallback } from 'react';

import classNames from 'classnames';

import { Blue2RightRail } from '@/mastodon/features/blue2/right_rail';
import { Blue2ScrollToTop } from '@/mastodon/features/blue2/scroll_to_top';
import { ComposeRedesignButton } from '@/mastodon/features/compose/redesign/trigger';
import { Footer } from '@/mastodon/features/custom_homepage/components/footer';
import { CollapsibleNavigationPanel } from '@/mastodon/features/navigation_panel';
import { RedesignNavigationPanel } from '@/mastodon/features/navigation_panel/redesign';
import { RedesignMobileNavigation } from '@/mastodon/features/navigation_panel/redesign/mobile_nav';
import { useBreakpoint } from '@/mastodon/features/ui/hooks/useBreakpoint';
import { useColumnsContext } from '@/mastodon/features/ui/util/columns_context';
import { useAppSelector } from '@/mastodon/store';

import classes from './styles.module.scss';
import multiColClasses from './styles_multi_column.module.scss';

import { ColumnsAreaMastodon5 } from '../../../mastodon5';
import {
  ComposePanel,
  RedirectToMobileComposeIfNeeded,
} from '../compose_panel';

import { MultiColumnContent } from './multi_column_content';
import { ColumnsAreaRedesign } from './redesign';

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
        {isMobileViewport ? <RedesignMobileNavigation /> : <ComposeRedesignButton />}

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

export const ColumnsArea: React.FC<ColumnsAreaProps> = (props) => {
  const theme =
    typeof document !== 'undefined' ? document.body.dataset.theme : undefined;

  if (theme === 'blue-2') {
    return <ColumnsAreaRedesign {...props} />;
  }

  if (theme === 'mastodon-5') {
    return <ColumnsAreaMastodon5 {...props} />;
  }

  return <ColumnsAreaLegacy {...props} />;
};
