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
  inline?: boolean;
  onResume: () => void;
}> = ({ inline, onResume }) => (
  <IconButton
    icon={PenNibIcon}
    variant='solid'
    color='accent'
    className={classNames(
      classes.button,
      classes.buttonResume,
      inline && classes.buttonInline,
    )}
    size='lg'
    data-blue2-compose-resume='true'
    data-blue2-compose-resume-inline={inline ? 'true' : undefined}
    onClick={onResume}
  >
    <FormattedMessage
      id='compose_form.show_composer'
      defaultMessage='Show composer'
    />
  </IconButton>
);

const getVisualViewportMetrics = (): VisualViewportMetrics => {
  if (typeof window === 'undefined') return emptyVisualViewportMetrics;

  const visualViewport = window.visualViewport;
  if (!visualViewport) return emptyVisualViewportMetrics;

  const layoutHeight = Math.max(
    document.documentElement?.clientHeight ?? 0,
    window.innerHeight,
  );
  const height = visualViewport.height;
  const offsetTop = visualViewport.offsetTop;
  const bottomInset = Math.max(
    0,
    layoutHeight - (visualViewport.height + visualViewport.offsetTop),
  );

  // A meaningful height reduction is a more stable keyboard signal than tiny
  // browser chrome changes while scrolling on iOS/Android.
  const keyboardOpen = layoutHeight - height > 160;

  return {
    height,
    offsetTop,
    bottomInset,
    centerY: offsetTop + height / 2,
    keyboardOpen,
  };
};

const portalBlue2InlineOverlay = (
  node: React.ReactNode,
  enabled: boolean,
): React.ReactNode => {
  if (!enabled || typeof document === 'undefined') return node;
  return createPortal(node, document.body);
};

export const ComposeRedesignButton: React.FC<{
  inline?: boolean;
}> = ({ inline }) => {
  const dispatch = useAppDispatch();
  const { signedIn } = useIdentity();
  const displayState = useAppSelector((state) => state.composer.displayState);
  const origin = useAppSelector((state) => state.composer.origin);
  const editor = useAppSelector(selectComposerEditor);
  const isBlue2 = useBlue2Theme();
  const [viewport, setViewport] = useState<VisualViewportMetrics>(() =>
    getVisualViewportMetrics(),
  );
  const composerRef = useRef<HTMLFormElement>(null);
  const launcherOriginRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateViewport = () => {
      setViewport(getVisualViewportMetrics());
    };
    const visualViewport = window.visualViewport;

    updateViewport();
    visualViewport?.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  const handleBackdropClick = useCallback(() => {
    dispatch(minimizeComposerToggle());
  }, [dispatch]);

  const captureLauncherOrigin = useCallback((element: HTMLElement) => {
    launcherOriginRef.current = composerOriginFromElement(element);
  }, []);

  const captureLauncherPointerOrigin: React.PointerEventHandler<HTMLButtonElement> =
    useCallback(
      (event) => {
        captureLauncherOrigin(event.currentTarget);
      },
      [captureLauncherOrigin],
    );

  const captureLauncherFocusOrigin: React.FocusEventHandler<HTMLButtonElement> =
    useCallback(
      (event) => {
        if (!launcherOriginRef.current) {
          captureLauncherOrigin(event.currentTarget);
        }
      },
      [captureLauncherOrigin],
    );

  const handleMenuItemClick: React.MouseEventHandler<HTMLButtonElement> =
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

    // This is a persistent composer card, not a menu. Opt it out of the native
    // Popover API that MenuCard now enables by default via upstream #40448.
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
      isBlue2 && !!inline,
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
          id='tabs_bar.publish'
          defaultMessage='Write a new post or messsage'
        />
      </MenuTrigger>
      <MenuList placement='top-end' offset={4} maxWidth={180}>
        <MenuItem
          name='post'
          icon={NewspaperIcon}
          onClick={handleMenuItemClick}
        >
          <FormattedMessage id='compose_form.post' defaultMessage='Post' />
        </MenuItem>
        <MenuItem
          name='message'
          icon={ChatCircleIcon}
          onClick={handleMenuItemClick}
        >
          <FormattedMessage id='compose_form.message' defaultMessage='Message' />
        </MenuItem>
      </MenuList>
    </Menu>
  );
};
