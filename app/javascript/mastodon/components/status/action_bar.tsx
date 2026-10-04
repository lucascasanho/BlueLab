import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

import classNames from 'classnames';

import {
  ArrowsClockwiseIcon,
  BookmarkSimpleIcon,
  ChatCircleIcon,
  DotsThreeIcon,
  QuotesIcon,
  ShareFatIcon,
  StarIcon,
} from '@phosphor-icons/react';

import { statusInteraction } from '@/mastodon/actions/interactions';
import { fetchStatus } from '@/mastodon/actions/statuses';
import { animateFavouriteIcon } from '@/mastodon/components/status/favourite_animation';
import { useCurrentAccountId } from '@/mastodon/hooks/useAccountId';
import { useAccountStatus } from '@/mastodon/hooks/useStatus';
import { quickBoosting } from '@/mastodon/initial_state';
import type { MenuItem as DropdownItem } from '@/mastodon/models/dropdown_menu';
import type { AccountStatusShape } from '@/mastodon/models/status';
import { selectStatusConditions } from '@/mastodon/selectors/statuses';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import {
  Button,
  IconButton,
  ToggleButton,
  ToggleIconButton,
} from '../button/redesign';
import {
  Menu,
  MenuItem,
  MenuList,
  MenuTrigger,
  LegacyDropdownMenuItems,
} from '../menu';

import { boostItemState, quoteItemState } from './boost_button_utils';
import { useStatusContext, useStatusMenuActions } from './hooks';
import { RemoveQuoteHint } from './legacy/action_bar/remove_quote_hint';
import classes from './styles.module.scss';

interface StatusActionBarProps {
  statusId: string;
  withDismiss?: boolean;
  withCounters?: boolean;
  /** Only show methods to respond (reply, boost, like) and not sharing, bookmarking, and the overflow menu. */
  onlyResponses?: boolean;
}

const messages = defineMessages({
  replyAll: { id: 'status.replyAll', defaultMessage: 'Reply to thread' },
  favourite: { id: 'status.favourite', defaultMessage: 'Favorite' },
  removeFavourite: {
    id: 'status.remove_favourite',
    defaultMessage: 'Remove from favorites',
  },
});

export const StatusActionBar: React.FC<StatusActionBarProps> = ({
  statusId,
  withDismiss,
  withCounters,
  onlyResponses,
}) => {
  const status = useAccountStatus(statusId);
  const quotedAccountId = useAppSelector(
    (state) =>
      state.statuses.getIn([status?.quote?.quoted_status, 'account']) ?? null,
  );
  const currentAccountId = useCurrentAccountId();
  const { contextType } = useStatusContext();
  const statusUrl = status?.url ?? status?.uri;

  // Actions
  const dispatch = useAppDispatch();
  const handleReplyClick = useCallback(() => {
    dispatch(statusInteraction({ statusId, intent: 'reply', contextType }));
  }, [contextType, dispatch, statusId]);
  const handleFavouriteClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      animateFavouriteIcon(event.currentTarget, status?.favourited ?? false);
      dispatch(
        statusInteraction({ statusId, intent: 'favourite', contextType }),
      );
    },
    [contextType, dispatch, status?.favourited, statusId],
  );
  const handleShareClick = useCallback(() => {
    if (!statusUrl) {
      return;
    }

    // We need to make this partial as by default share always is set, despite not being supported in FF.
    const nav = navigator as Partial<Pick<Navigator, 'share'>> &
      Pick<Navigator, 'clipboard'>;
    if (nav.share) {
      void nav.share({
        url: statusUrl,
      });
    } else {
      dispatch(statusInteraction({ statusId, intent: 'copy', contextType }));
    }
  }, [contextType, dispatch, statusId, statusUrl]);

  const intl = useIntl();
  const favouriteIcon = useIconWeight(StarIcon, status?.favourited && 'fill');
  const bookmarkIcon = useIconWeight(
    BookmarkSimpleIcon,
    status?.bookmarked && 'fill',
  );

  if (!status) {
    return null;
  }

  const isPublic =
    status.visibility === 'public' || status.visibility === 'unlisted';

  const isQuotingMe = quotedAccountId === currentAccountId;
  const shouldShowQuoteRemovalHint =
    isQuotingMe && contextType === 'notifications';

  const responseButtons = (
    <>
      <Button
        size='sm'
        clipPadding
        variant='ghost'
        leadingIcon={reply.icon}
        onClick={reply.action}
        tooltip={{ type: 'label', text: reply.title }}
      >
        {withCounters && reply.counter}
      </Button>

      <StatusReblogButton statusId={statusId}>
        {withCounters && status.reblogs_count}
      </StatusReblogButton>

      <ToggleButton
        size='sm'
        variant='ghost'
        active={status.favourited}
        title={favouriteTitle}
        leadingIcon={favouriteIcon}
        leadingIconWrapperClassName='favourite-animation-target'
        onClick={handleFavouriteClick}
        className={classNames(
          classes.favouriteButton,
          'star-icon',
          !onlyResponses && classes.actionsButtonGap,
        )}
      >
        {withCounters && like.counter}
      </ToggleButton>
    </>
  );

  if (onlyResponses) {
    return <div className={classes.actions}>{responseButtons}</div>;
  }

  return (
    <div className={classes.actions}>
      {responseButtons}

      {isPublic && (
        <IconButton
          size='sm'
          variant='ghost'
          icon={ShareFatIcon}
          onClick={handleShareClick}
        >
          <FormattedMessage id='status.share' defaultMessage='Share' />
        </IconButton>
      )}

      <ToggleIconButton
        size='sm'
        variant='ghost'
        active={status.bookmarked}
        icon={bookmarkIcon}
        onClick={handleBookmarkClick}
      >
        {bookmark.title}
      </ToggleIconButton>

      <RemoveQuoteHint
        className='status__action-bar__button-wrapper'
        canShowHint={shouldShowQuoteRemovalHint}
      >
        {(dismissQuoteHint) => (
          <StatusActionMenu
            dismissQuoteHint={dismissQuoteHint}
            status={status}
            withDismiss={withDismiss}
          />
        )}
      </RemoveQuoteHint>
    </div>
  );
};
const StatusReblogButton: React.FC<{
  statusId: string;
  children: React.ReactNode;
}> = ({ statusId, children }) => {
  const { boost, quote } = useStatusIcons(statusId);

  if (quickBoosting) {
    return (
      <ToggleButton
        size='sm'
        variant='ghost'
        active={boost.active}
        tooltip={{
          type: 'label',
          text: boost.title,
        }}
        leadingIcon={boost.icon}
        disabled={boost.disabled}
        onClick={boost.action}
      >
        {children}
      </ToggleButton>
    );
  }

  return (
    <Menu>
      <MenuTrigger
        as={ToggleButton}
        size='sm'
        variant='ghost'
        active={boost.active}
        tooltip={{
          type: 'label',
          text: (
            <FormattedMessage
              id='status.reblog_or_quote'
              defaultMessage='Boost or quote'
            />
          ),
        }}
        leadingIcon={boost.icon}
      >
        {children}
      </MenuTrigger>

      <MenuList placement='bottom' maxWidth={180}>
        <MenuItem
          onClick={boost.action}
          icon={boost.icon}
          disabled={boost.disabled}
          description={boost.meta}
        >
          {boost.title}
        </MenuItem>
        <MenuItem
          onClick={quote.action}
          icon={quote.icon}
          disabled={quote.disabled}
          description={quote.meta}
        >
          {quote.title}
        </MenuItem>
      </MenuList>
    </Menu>
  );
};

const StatusActionMenu: React.FC<{
  dismissQuoteHint: () => void;
  status: AccountStatusShape;
  withDismiss?: boolean;
}> = ({ status, dismissQuoteHint, withDismiss }) => {
  const { contextType } = useStatusContext();
  const dispatch = useAppDispatch();

  const menu = useStatusMenuActions({ status, contextType, withDismiss });

  const onOpen = useCallback(() => {
    // Replicates needsStatusRefresh of the Dropdown component.
    if (quickBoosting && !status.quote_approval) {
      dispatch(
        fetchStatus(status.id, { forceFetch: true, alsoFetchContext: false }),
      );
    }

    dismissQuoteHint();
  }, [dismissQuoteHint, dispatch, status.id, status.quote_approval]);

  return (
    <Menu onOpen={onOpen}>
      <MenuTrigger
        as={IconButton}
        size='sm'
        variant='ghost'
        icon={DotsThreeIcon}
      >
        <FormattedMessage id='status.more' defaultMessage='More' />
      </MenuTrigger>

      <MenuList placement='top-end'>
        <LegacyDropdownMenuItems items={menu} />
      </MenuList>
    </Menu>
  );
};

export const StatusActionItem: React.FC<{ item: DropdownItem }> = ({
  item,
}) => {
  if (!item) {
    return <MenuItemDivider />;
  }

  const commonProps = {
    icon: item.icon,
    disabled: item.disabled,
    destructive: item.dangerous,
    children: item.text,
    description: item.description,
  } as const;

  if ('to' in item) {
    return <MenuItemLink {...commonProps} to={item.to} as='link' />;
  } else if ('href' in item) {
    return <MenuItemLink {...commonProps} href={item.href} as='a' />;
  }

  return <MenuItem {...commonProps} onClick={item.action} />;
};
