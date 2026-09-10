/* eslint-disable jsx-a11y/no-autofocus */
import type React from 'react';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { FormattedMessage } from 'react-intl';

import classNames from 'classnames';

import {
  ChatCircleIcon,
  NewspaperIcon,
  PenNibIcon,
} from '@phosphor-icons/react';

import { IconButton } from '@/mastodon/components/button/redesign';
import { CircularProgress } from '@/mastodon/components/circular_progress';
import {
  Menu,
  MenuTrigger,
  MenuList,
  MenuItem,
} from '@/mastodon/components/menu';
import { MenuCard } from '@/mastodon/components/menu/card';
import { useIdentity } from '@/mastodon/identity_context';
import {
  composerOriginFromElement,
  openNewComposer,
  openPreferredComposer,
  minimizeComposerToggle,
  selectComposerEditor,
} from '@/mastodon/reducers/slices/composer';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import AddIcon from '@/material-icons/400-24px/add.svg?react';

import { ComposeFormHeader } from './header';
import classes from './trigger.module.scss';

const ComposeLazyForm = lazy(() =>
  import('./index').then(({ RedesignComposeForm }) => ({
    default: RedesignComposeForm,
  })),
);

interface VisualViewportMetrics {
  height: number | null;
  offsetTop: number;
  bottomInset: number;
  centerY: number | null;
  keyboardOpen: boolean;
}

const emptyVisualViewportMetrics: VisualViewportMetrics = {
  height: null,
  offsetTop: 0,
  bottomInset: 0,
  centerY: null,
  keyboardOpen: false,
};

export const useBlue2Theme = () => {
  const [isBlue2, setIsBlue2] = useState(
    () =>
      typeof document !== 'undefined' &&
      document.body.dataset.theme === 'blue-2',
  );

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const body = document.body;
    const syncTheme = () => {
      setIsBlue2(body.dataset.theme === 'blue-2');
    };

    syncTheme();

    if (typeof MutationObserver === 'undefined') return undefined;

    const observer = new MutationObserver(syncTheme);
    observer.observe(body, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return isBlue2;
};

export const shouldHideBlue2GlobalTrigger = (
  isBlue2: boolean,
  inline: boolean | undefined,
  displayState: 'hidden' | 'showing' | 'minimized',
) => isBlue2 && !inline && displayState !== 'showing';

export const ComposerBackdrop: React.FC<{ onMinimize: () => void }> = ({
  onMinimize,
}) => (
  <button
    type='button'
    tabIndex={-1}
    aria-hidden='true'
    className={classes.composerBackdrop}
    data-bluelab-composer-backdrop
    onClick={onMinimize}
  />
);

export const ComposerResumeButton: React.FC<{
  onResume: () => void;
  inline?: boolean;
}> = ({ onResume, inline }) => (
  <IconButton
    icon={PenNibIcon}
    variant='solid'
    color='accent'
    className={classNames(
      classes.button,
      inline && classes.buttonInline,
      !inline && classes.blue2ResumeButton,
    )}
    size='lg'
    data-blue2-compose-resume
    data-blue2-compose-resume-inline={inline ? 'true' : undefined}
    onClick={onResume}
  >
    <FormattedMessage id='compose.expand' defaultMessage='Show composer' />
  </IconButton>
);

export const ComposeRedesignButton: React.FC<{
  /**
   * Render the button in regular document flow instead of fixed positioning for mobile layout
   */
  inline?: boolean;
}> = ({ inline }) => {
  const displayState = useAppSelector((state) => state.composer.displayState);
  const origin = useAppSelector((state) => state.composer.origin);
  const editor = useAppSelector(selectComposerEditor);
  const { signedIn } = useIdentity();
  const composerRef = useRef<HTMLFormElement>(null);
  const launcherOriginRef = useRef<ReturnType<
    typeof composerOriginFromElement
  > | null>(null);
  const isBlue2 = useBlue2Theme();
  const portalBlue2InlineOverlay = (content: React.ReactNode) =>
    isBlue2 && inline && typeof document !== 'undefined'
      ? createPortal(content, document.body)
      : content;

  /*
   * Keep VisualViewport metrics in React state instead of mutating the form from
   * a layout effect. The redesigned form is lazy-loaded; an effect can run while
   * Suspense is still showing its fallback and never see composerRef.current.
   * State survives that delay, so the form receives the correct visible height
   * as soon as it mounts and whenever the software keyboard changes it.
   */
  const [viewport, setViewport] = useState<VisualViewportMetrics>(
    emptyVisualViewportMetrics,
  );
  useEffect(() => {
    const updateViewport = () => {
      const visualViewport = window.visualViewport;
      const height = visualViewport?.height ?? window.innerHeight;
      const offsetTop = visualViewport?.offsetTop ?? 0;
      const bottomInset = Math.max(0, window.innerHeight - offsetTop - height);

      setViewport({
        height,
        offsetTop,
        bottomInset,
        centerY: offsetTop + height / 2,
        keyboardOpen: window.innerHeight - height > 150,
      });
    };

    updateViewport();
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  const dispatch = useAppDispatch();
  const handleBackdropClick = useCallback(() => {
    dispatch(minimizeComposerToggle());
  }, [dispatch]);
  const captureLauncherPointerOrigin: React.PointerEventHandler<HTMLButtonElement> =
    useCallback((event) => {
      launcherOriginRef.current = composerOriginFromElement(
        event.currentTarget,
      );
    }, []);
  const captureLauncherFocusOrigin: React.FocusEventHandler<HTMLButtonElement> =
    useCallback((event) => {
      launcherOriginRef.current = composerOriginFromElement(
        event.currentTarget,
      );
    }, []);
  const handleComposerOpen: React.MouseEventHandler<HTMLButtonElement> =
    useCallback(
      (event) => {
        const {
          currentTarget: { name },
        } = event;
        if (name === 'post' || name === 'message') {
          dispatch(
            openNewComposer({
              type: name,
              origin: launcherOriginRef.current ?? undefined,
            }),
          );
        }
      },
      [dispatch],
    );

  const handleMastodonOpen: React.MouseEventHandler<HTMLButtonElement> =
    useCallback(
      (event) => {
        dispatch(
          openPreferredComposer({
            origin: composerOriginFromElement(event.currentTarget),
          }),
        );
      },
      [dispatch],
    );

  useLayoutEffect(() => {
    const composer = composerRef.current;
    if (!composer || !origin) return;

    const rect = composer.getBoundingClientRect();
    composer.style.setProperty(
      '--composer-origin-x',
      `${origin.x - rect.left}px`,
    );
    composer.style.setProperty(
      '--composer-origin-y',
      `${origin.y - rect.top}px`,
    );
  }, [displayState, origin]);

  if (!signedIn) return null;

  // BLUE 2.0 owns its launcher UI elsewhere, so keep this global trigger hidden
  // while idle/minimized. When the shared state changes to showing, however,
  // this component must stay mounted because it is the desktop composer host.
  if (shouldHideBlue2GlobalTrigger(isBlue2, inline, displayState)) return null;

  // BLUE 2.0 always uses the redesigned composer so the theme can provide the
  // Bluesky-like compose experience without changing the editor used by other themes.
  if (editor === 'mastodon' && !isBlue2) {
    return (
      <IconButton
        icon={AddIcon}
        variant='solid'
        color='accent'
        className={classNames(
          classes.button,
          classes.mastodonButton,
          inline && classes.buttonInline,
        )}
        size='lg'
        onClick={handleMastodonOpen}
      >
        <FormattedMessage id='tabs_bar.publish' defaultMessage='New Post' />
      </IconButton>
    );
  }

  if (displayState === 'minimized') {
    if (isBlue2) {
      // Keep the minimized launcher inside RedesignMobileNavigation instead of
      // portaling it to <body>. The Blue 2 navigation shell already owns the
      // proven portrait behavior: above the bottom row while visible and down
      // into the vacated row when mobile chrome auto-hides during scrolling.
      return (
        <ComposerResumeButton inline={inline} onResume={handleBackdropClick} />
      );
    }

    return (
      <MenuCard
        popover={undefined}
        className={classes.composerMinimized}
        elevation={2}
      >
        <ComposeFormHeader />
      </MenuCard>
    );
  }

  if (displayState === 'showing') {
    const style = {
      '--viewport-height': viewport.height ? `${viewport.height}px` : undefined,
      '--composer-visual-viewport-height': viewport.height
        ? `${viewport.height}px`
        : undefined,
      '--composer-visual-viewport-offset-top': `${viewport.offsetTop}px`,
      '--composer-visual-viewport-center-y': viewport.centerY
        ? `${viewport.centerY}px`
        : undefined,
      '--composer-visual-viewport-bottom': `${viewport.bottomInset}px`,
    } as React.CSSProperties;

    return portalBlue2InlineOverlay(
      <>
        {isBlue2 && <ComposerBackdrop onMinimize={handleBackdropClick} />}
        <Suspense fallback={<CircularProgress strokeWidth={2} size={50} />}>
          <ComposeLazyForm
            ref={composerRef}
            autoFocus
            className={classes.composer}
            style={style}
            data-keyboard-open={viewport.keyboardOpen ? 'true' : undefined}
          />
        </Suspense>
      </>,
    );
  }

  return (
    <Menu>
      <MenuTrigger
        as={IconButton}
        icon={PenNibIcon}
        variant='solid'
        color='accent'
        className={classNames(classes.button, inline && classes.buttonInline)}
        size='lg'
        data-blue2-compose-fab={isBlue2 ? 'true' : undefined}
        onPointerDown={captureLauncherPointerOrigin}
        onFocus={captureLauncherFocusOrigin}
      >
        <FormattedMessage
          id='compose.new'
          defaultMessage='Write a new post or messsage'
        />
      </MenuTrigger>

      <MenuList
        portal
        mobilePresentation='popover'
        maxWidth={180}
        placement='top-end'
        strategy='fixed'
        offset={8}
        data-testid='blue2-compose-type-menu'
      >
        <MenuItem name='post' onClick={handleComposerOpen} icon={NewspaperIcon}>
          <FormattedMessage id='compose.new.post' defaultMessage='Post' />
        </MenuItem>

        <MenuItem
          name='message'
          onClick={handleComposerOpen}
          icon={ChatCircleIcon}
        >
          <FormattedMessage
            id='compose.new.message'
            defaultMessage='Message'
            description='Message refers to a direct message. For languages where this is confusing, "chat" or "direct message" can be used.'
          />
        </MenuItem>
      </MenuList>
    </Menu>
  );
};
