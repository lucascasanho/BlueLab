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
  const isBlue2 =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';

  // Update viewport based on visual size in order to account for the virtual keyboard.
  const [viewportHeight, setViewportHeight] = useState<null | number>(null);
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(visualViewport?.height ?? null);
    };

    updateHeight();
    visualViewport?.addEventListener('resize', updateHeight);

    return () => {
      visualViewport?.removeEventListener('resize', updateHeight);
    };
  }, []);

  const dispatch = useAppDispatch();
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
    if (!composer) return;

    if (origin) {
      const rect = composer.getBoundingClientRect();
      composer.style.setProperty(
        '--composer-origin-x',
        `${origin.x - rect.left}px`,
      );
      composer.style.setProperty(
        '--composer-origin-y',
        `${origin.y - rect.top}px`,
      );
    }

    const visualViewport = window.visualViewport;
    const updateVisualViewport = () => {
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const viewportOffsetTop = visualViewport?.offsetTop ?? 0;
      const bottomInset = Math.max(
        0,
        window.innerHeight - viewportOffsetTop - viewportHeight,
      );
      const viewportCenterY = viewportOffsetTop + viewportHeight / 2;
      const keyboardOpen = window.innerHeight - viewportHeight > 150;

      composer.style.setProperty(
        '--composer-visual-viewport-height',
        `${viewportHeight}px`,
      );
      composer.style.setProperty(
        '--composer-visual-viewport-offset-top',
        `${viewportOffsetTop}px`,
      );
      composer.style.setProperty(
        '--composer-visual-viewport-center-y',
        `${viewportCenterY}px`,
      );
      composer.style.setProperty(
        '--composer-visual-viewport-bottom',
        `${bottomInset}px`,
      );
      composer.toggleAttribute('data-keyboard-open', keyboardOpen);
    };

    updateVisualViewport();
    visualViewport?.addEventListener('resize', updateVisualViewport);
    visualViewport?.addEventListener('scroll', updateVisualViewport);

    return () => {
      visualViewport?.removeEventListener('resize', updateVisualViewport);
      visualViewport?.removeEventListener('scroll', updateVisualViewport);
    };
  }, [displayState, origin]);

  if (!signedIn) return null;

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
    return (
      <MenuCard className={classes.composerMinimized} elevation={2}>
        <ComposeFormHeader />
      </MenuCard>
    );
  }

  if (displayState === 'showing') {
    // Pass the viewport height as a CSS variable so it's only used for mobile.
    const style = {
      '--viewport-height': viewportHeight ? `${viewportHeight}px` : undefined,
    } as React.CSSProperties;

    return (
      <Suspense fallback={<CircularProgress strokeWidth={2} size={50} />}>
        <ComposeLazyForm
          ref={composerRef}
          autoFocus
          className={classes.composer}
          style={style}
        />
      </Suspense>
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
        onPointerDown={captureLauncherPointerOrigin}
        onFocus={captureLauncherFocusOrigin}
      >
        <FormattedMessage
          id='compose.new'
          defaultMessage='Write a new post or messsage'
        />
      </MenuTrigger>

      <MenuList maxWidth={180} placement='top-end'>
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
