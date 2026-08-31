import { useCallback } from 'react';

import classNames from 'classnames';

import { ComposeRedesignButton } from '@/mastodon/features/compose/redesign/trigger';
import { Footer } from '@/mastodon/features/custom_homepage/components/footer';
import { Header } from '@/mastodon/features/custom_homepage/components/header';
import { CollapsibleNavigationPanel } from '@/mastodon/features/navigation_panel';
import { useBreakpoint } from '@/mastodon/features/ui/hooks/useBreakpoint';
import { useColumnsContext } from '@/mastodon/features/ui/util/columns_context';
import { useAppSelector } from '@/mastodon/store';

import {
  ComposePanel,
  RedirectToMobileComposeIfNeeded,
} from '../compose_panel';

import { MultiColumnContent } from './multi_column_content';

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
  const renderComposePanel = !useBreakpoint('full');
  const isModalOpen = useAppSelector(
    (state) => !state.modal.get('stack').isEmpty(),
  );
  const useBlueLabComposer = useAppSelector(
    (state) => state.compose.get('composer_editor') !== 'mastodon',
  );

  if (minimalShell) {
    return (
      <div className='columns-area__panels'>
        <div className='columns-area__panels__main'>
          <Header />

          <div className='tabs-bar__wrapper'>
            <TabsBarPortal />
          </div>

          <div className='columns-area columns-area--mobile'>{children}</div>

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

        <ComposeRedesignButton />

        <main className='columns-area__panels__main'>
          <div className='tabs-bar__wrapper'>
            <TabsBarPortal />
          </div>

          <div className='columns-area columns-area--mobile'>{children}</div>
        </main>

        <CollapsibleNavigationPanel />
      </div>
    );
  }

  return (
    <main
      className={classNames('columns-area', { unscrollable: isModalOpen })}
      ref={ref}
      tabIndex={isModalOpen ? undefined : 0}
    >
      <MultiColumnContent>{children}</MultiColumnContent>
    </main>
  );
};

export const ColumnsArea: React.FC<ColumnsAreaProps> = (props) => {
  return <ColumnsAreaLegacy {...props} />;
};
