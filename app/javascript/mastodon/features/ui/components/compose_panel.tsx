import { useCallback, useEffect, useLayoutEffect } from 'react';

import { FormattedMessage } from 'react-intl';

import { PenNibIcon } from '@phosphor-icons/react';

import { Button } from '@/mastodon/components/button/redesign';
import { useLayout } from '@/mastodon/hooks/useLayout';
import {
  composerOriginFromElement,
  openPreferredComposer,
} from '@/mastodon/reducers/slices/composer';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import {
  changeComposing,
  mountCompose,
  unmountCompose,
} from 'mastodon/actions/compose';
import { useAppHistory } from 'mastodon/components/router';
import ServerBanner from 'mastodon/components/server_banner';
import { NavigationBar } from 'mastodon/features/compose/components/navigation_bar';
import { Search } from 'mastodon/features/compose/components/search';
import ComposeFormContainer from 'mastodon/features/compose/containers/compose_form_container';
import { LinkFooter } from 'mastodon/features/ui/components/link_footer';
import { useIdentity } from 'mastodon/identity_context';

const NewPostButton: React.FC = () => {
  const dispatch = useAppDispatch();
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      dispatch(
        openPreferredComposer({
          origin: composerOriginFromElement(event.currentTarget),
        }),
      );
    },
    [dispatch],
  );

  return (
    <Button
      variant='solid'
      color='accent'
      leadingIcon={PenNibIcon}
      className='compose-panel__new-post-button'
      onClick={handleClick}
    >
      <FormattedMessage id='tabs_bar.publish' defaultMessage='New Post' />
    </Button>
  );
};

export const ComposePanel: React.FC<{ showComposer?: boolean }> = ({
  showComposer = true,
}) => {
  const dispatch = useAppDispatch();
  const handleFocus = useCallback(() => {
    dispatch(changeComposing(true));
  }, [dispatch]);
  const { signedIn } = useIdentity();
  const hideComposer = useAppSelector((state) => {
    const mounted = state.compose.get('mounted');
    if (typeof mounted === 'number') {
      return mounted > 1;
    }
    return false;
  });

  useEffect(() => {
    if (!showComposer) return undefined;
    dispatch(mountCompose());
    return () => {
      dispatch(unmountCompose());
    };
  }, [dispatch, showComposer]);

  const { singleColumn } = useLayout();

  return (
    <div className='compose-panel' onFocus={handleFocus}>
      <Search singleColumn={singleColumn} />

      {!signedIn && (
        <>
          <ServerBanner />
          <div className='flex-spacer' />
        </>
      )}

      {signedIn && showComposer && !hideComposer && (
        <ComposeFormContainer singleColumn />
      )}
      {signedIn && showComposer && hideComposer && (
        <div className='compose-form' />
      )}
      {signedIn && !showComposer && (
        <>
          <NavigationBar />
          <NewPostButton />
          <div className='flex-spacer' />
        </>
      )}

      <LinkFooter context={singleColumn ? 'default' : 'multi-column'} />
    </div>
  );
};

/**
 * Redirect the user to the standalone compose page when the
 * sidebar composer is hidden due to a change in viewport size
 * while a post is being written.
 */

export const RedirectToMobileComposeIfNeeded: React.FC = () => {
  const history = useAppHistory();

  const shouldRedirect = useAppSelector((state) =>
    state.compose.get('should_redirect_to_compose_page'),
  );

  useLayoutEffect(() => {
    if (shouldRedirect) {
      history.push('/publish', { focusTarget: false });
    }
  }, [history, shouldRedirect]);

  return null;
};
