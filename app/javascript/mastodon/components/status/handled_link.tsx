import { useCallback } from 'react';
import type { ComponentProps, FC } from 'react';

import classNames from 'classnames';
import { useHistory } from 'react-router';
import { Link } from 'react-router-dom';

import { openURL } from '@/mastodon/actions/search';
import type { ApiMentionJSON } from '@/mastodon/api_types/statuses';
import { getCollectionPath } from '@/mastodon/features/collections/utils';
import { useAppDispatch } from '@/mastodon/store';
import {
  getLocalUrlPath,
  handleFederatedLinkClick,
  resolveFederatedLink,
} from '@/mastodon/utils/federated_links';
import type { OnElementHandler } from '@/mastodon/utils/html';

export interface HandledLinkProps {
  href: string;
  text: string;
  prevText?: string;
  hashtagAccountId?: string;
  mention?: Pick<ApiMentionJSON, 'id' | 'acct'>;
  collectionId?: string;
}

export const HandledLink: FC<HandledLinkProps & ComponentProps<'a'>> = ({
  href,
  text,
  prevText,
  hashtagAccountId,
  mention,
  collectionId,
  className,
  children,
  ...props
}) => {
  const dispatch = useAppDispatch();
  const history = useHistory();

  const localPath = getLocalUrlPath(href);
  const handleClick = useCallback<React.MouseEventHandler<HTMLAnchorElement>>(
    (event) => {
      void handleFederatedLinkClick({
        event,
        href,
        resolve: (url) =>
          resolveFederatedLink(url, async () => {
            const result = await dispatch(openURL({ url })).unwrap();
            return result;
          }),
        navigateLocal: (path) => {
          history.push(path);
        },
        navigateExternal: (url) => {
          window.location.assign(url);
        },
      });
    },
    [dispatch, history, href],
  );

  // Handle hashtags
  if (
    (text.startsWith('#') ||
      prevText?.endsWith('#') ||
      text.startsWith('＃') ||
      prevText?.endsWith('＃')) &&
    !text.includes('%')
  ) {
    const hashtag = text.slice(1).trim();

    return (
      <Link
        className={classNames('mention hashtag', className)}
        to={`/tags/${encodeURIComponent(hashtag)}`}
        rel='tag'
        data-menu-hashtag={hashtagAccountId}
      >
        {children}
      </Link>
    );
  } else if (mention) {
    // Handle mentions
    return (
      <Link
        className={classNames('mention', className)}
        to={`/@${mention.acct}`}
        title={`@${mention.acct}`}
        data-hover-card-account={mention.id}
      >
        {children}
      </Link>
    );
  } else if (collectionId) {
    return (
      <Link
        className={classNames(className)}
        to={getCollectionPath(collectionId)}
      >
        {children}
      </Link>
    );
  }

  // Non-absolute paths treated as internal links. This shouldn't happen, but just in case.
  if (href.startsWith('/')) {
    return (
      <Link className={classNames('unhandled-link', className)} to={href}>
        {children}
      </Link>
    );
  }

  if (localPath) {
    return (
      <Link className={classNames('unhandled-link', className)} to={localPath}>
        {children}
      </Link>
    );
  }

  return (
    <a
      {...props}
      href={href}
      title={href}
      className={classNames('unhandled-link', className)}
      target='_blank'
      rel='noopener'
      translate='no'
      onClick={handleClick}
    >
      {children}
    </a>
  );
};

export const useElementHandledLink = ({
  hashtagAccountId,
  hrefToCollectionId: hrefToCollection,
  hrefToMention,
}: {
  hashtagAccountId?: string;
  hrefToCollectionId?: (href: string) => string | undefined;
  hrefToMention?: (href: string) => ApiMentionJSON | undefined;
} = {}) => {
  const onElement = useCallback<OnElementHandler>(
    (element, { key, ...props }, children) => {
      if (element instanceof HTMLAnchorElement) {
        const mention = hrefToMention?.(element.href);
        const collectionId = hrefToCollection?.(element.href);
        return (
          <HandledLink
            {...props}
            key={key as string} // React requires keys to not be part of spread props.
            href={element.href}
            text={element.innerText}
            prevText={element.previousSibling?.textContent ?? undefined}
            hashtagAccountId={hashtagAccountId}
            mention={mention}
            collectionId={collectionId}
          >
            {children}
          </HandledLink>
        );
      }
      return undefined;
    },
    [hashtagAccountId, hrefToCollection, hrefToMention],
  );
  return { onElement };
};
