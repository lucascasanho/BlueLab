import { useCallback, useEffect, useRef, useState } from 'react';

import { FormattedMessage } from 'react-intl';

import classNames from 'classnames';
import { useRouteMatch } from 'react-router';

import { ChatCircleDotsIcon } from '@phosphor-icons/react';

import type { IconButtonProps } from '@/mastodon/components/button/vanilla_redesign';
import { IconButton } from '@/mastodon/components/button/vanilla_redesign';
import { ComposeIcon } from '@/mastodon/components/compose_icon';
import {
  Menu,
  MenuItem,
  MenuList,
  MenuTrigger,
} from '@/mastodon/components/menu';
import { useIdentity } from '@/mastodon/identity_context';
import type { ComposerOrigin } from '@/mastodon/reducers/slices/composer';
import {
  composerOriginFromElement,
  minimizeComposerToggle,
  openNewComposer,
  selectComposerEditor,
} from '@/mastodon/reducers/slices/composer';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import { isRedesignEnabled } from '@/mastodon/utils/environment';

import { useBreakpoint } from '../../ui/hooks/useBreakpoint';
import { RedesignComposeForm as BlueLabComposeForm } from '../redesign';

import { ComposeFormHeader } from './header';
import { RedesignComposeForm as VanillaComposeForm } from './index';
import composerClasses from './styles.module.scss';
import classes from './trigger.module.scss';

export const ComposeRedesignButton: React.FC<{
  /**
   * Render the button in regular document flow instead of fixed positioning for mobile layout
   */
  inline?: boolean;
}> = ({ inline = false }) => {
  const displayState = useAppSelector((state) => state.composer.displayState);
  const composerEditor = useAppSelector(selectComposerEditor);
  const isMobile = useBreakpoint('openable');

  const hasMobileFloatingActionButton = useHasMobileFloatingActionButton({
    isMobile,
  });

  // Track the visible viewport as the keyboard opens, closes, or pans the page.
  const [viewport, setViewport] = useState<{
    height: number | null;
    offsetTop: number;
    bottomInset: number;
    keyboardOpen: boolean;
  }>({
    height: null,
    offsetTop: 0,
    bottomInset: 0,
    keyboardOpen: false,
  });
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
  const launcherOriginRef = useRef<ComposerOrigin | null>(null);

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
        const type = event.currentTarget.name;
        if (type !== 'post' && type !== 'message') return;

        dispatch(
          openNewComposer({
            type,
            origin: launcherOriginRef.current ?? undefined,
          }),
        );
      },
      [dispatch],
    );

  const toggleMinimize = useCallback(() => {
    dispatch(minimizeComposerToggle());
  }, [dispatch]);

  const handleMinimizedTextClick: React.MouseEventHandler<HTMLDivElement> =
    useCallback(
      (event) => {
        if (
          event.target instanceof HTMLElement &&
          !event.target.closest('button')
        ) {
          dispatch(minimizeComposerToggle());
        }
      },
      [dispatch],
    );

  const { signedIn } = useIdentity();

  if (!isRedesignEnabled() || !signedIn) {
    return null;
  }

  const floatingButtonProps = {
    inline,
    hidden: !hasMobileFloatingActionButton,
  } as const;

  // Pass visible viewport metrics to CSS so the composer stays above the keyboard.
  const style = {
    '--viewport-height': viewport.height ? `${viewport.height}px` : undefined,
    '--composer-visual-viewport-height': viewport.height
      ? `${viewport.height}px`
      : undefined,
    '--composer-visual-viewport-offset-top': `${viewport.offsetTop}px`,
    '--composer-visual-viewport-bottom': `${viewport.bottomInset}px`,
  } as React.CSSProperties;

  if (displayState === 'minimized') {
    return isMobile ? (
      <FloatingActionButton
        icon={ComposeIcon}
        onClick={toggleMinimize}
        {...floatingButtonProps}
        hidden={false} // never hide minimized composer button
        color='neutral'
      >
        <FormattedMessage id='compose.expand' defaultMessage='Show composer' />
      </FloatingActionButton>
    ) : (
      <div className={classes.root} style={style}>
        {/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div
          onClick={handleMinimizedTextClick}
          className={classNames(
            classes.composerMinimized,
            composerClasses.root,
          )}
        >
          <ComposeFormHeader />
        </div>
        {/* eslint-enable */}
      </div>
    );
  }

  if (displayState === 'showing') {
    return (
      <div
        className={classes.root}
        style={style}
        data-keyboard-open={viewport.keyboardOpen ? 'true' : undefined}
      >
        {composerEditor === 'mastodon' ? (
          <VanillaComposeForm
            autoFocus
            className={classes.composer}
            data-keyboard-open={viewport.keyboardOpen ? 'true' : undefined}
          />
        ) : (
          <BlueLabComposeForm
            autoFocus
            vanillaAppearance
            className={classNames(classes.composer, classes.blueLabComposer)}
            data-keyboard-open={viewport.keyboardOpen ? 'true' : undefined}
          />
        )}
      </div>
    );
  }

  return (
    <Menu>
      <MenuTrigger
        as={FloatingActionButton}
        inline={inline}
        hidden={!hasMobileFloatingActionButton}
        icon={ComposeIcon}
        variant='solid'
        color='accent'
        size='lg'
        onPointerDown={captureLauncherPointerOrigin}
        onFocus={captureLauncherFocusOrigin}
      >
        <FormattedMessage
          id='compose.new'
          defaultMessage='Write a new post or message'
        />
      </MenuTrigger>
      <MenuList
        portal
        mobilePresentation='popover'
        maxWidth={180}
        placement='top-end'
        strategy='fixed'
        offset={8}
      >
        <MenuItem name='post' onClick={handleComposerOpen} icon={ComposeIcon}>
          <FormattedMessage id='compose.new.post' defaultMessage='Post' />
        </MenuItem>
        <MenuItem
          name='message'
          onClick={handleComposerOpen}
          icon={ChatCircleDotsIcon}
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

const FloatingActionButton: React.FC<
  {
    inline: boolean;
    hidden: boolean;
  } & IconButtonProps
> = ({ inline, hidden, ...otherProps }) => {
  return (
    // This component uses a wrapper element to prevent its
    // CSS transitions from messing with the button's own transitions
    <div
      className={classNames(
        classes.buttonWrapper,
        inline && classes.buttonWrapperInline,
        hidden && classes.buttonWrapperHidden,
      )}
      inert={hidden}
    >
      <IconButton variant='solid' color='accent' size='lg' {...otherProps} />
    </div>
  );
};

function includeMultiColumnPaths(paths: string[]) {
  return [...paths, ...paths.map((path) => `/deck${path}`)];
}

const MOBILE_COMPOSE_BUTTON_ALLOW_ROUTES = includeMultiColumnPaths([
  '/home',
  '/public',
  '/lists',
  '/tags',
]);
const MOBILE_COMPOSE_BUTTON_BLOCK_ROUTES = includeMultiColumnPaths([
  '/lists/new',
]);

function useHasMobileFloatingActionButton({ isMobile }: { isMobile: boolean }) {
  const isRouteWithMobileComposeButton = !!useRouteMatch({
    path: MOBILE_COMPOSE_BUTTON_ALLOW_ROUTES,
    exact: false,
  });

  const isRouteWithoutMobileComposeButton = !!useRouteMatch({
    path: MOBILE_COMPOSE_BUTTON_BLOCK_ROUTES,
    exact: true,
  });

  const shouldHideMobileComposeButton =
    !isMobile ||
    !isRouteWithMobileComposeButton ||
    isRouteWithoutMobileComposeButton;

  return !shouldHideMobileComposeButton;
}
