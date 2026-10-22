import { useCallback } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';

import { DotsThreeIcon, ShareFatIcon } from '@phosphor-icons/react';

import { statusInteraction } from '@/mastodon/actions/interactions';
import { fetchStatus } from '@/mastodon/actions/statuses';
import { animateFavouriteIcon } from '@/mastodon/components/status/favourite_animation';
import { useCurrentAccountId } from '@/mastodon/hooks/useAccountId';
import { useAccountStatus } from '@/mastodon/hooks/useStatus';
import { quickBoosting } from '@/mastodon/initial_state';
import type { MenuItem as DropdownItem } from '@/mastodon/models/dropdown_menu';
import type { AccountStatusShape } from '@/mastodon/models/status';
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
  MenuItemDivider,
  MenuItemLink,
  MenuList,
  MenuTrigger,
  LegacyDropdownMenuItems,
} from '../menu';
import { Tooltip } from '../tooltip';

import {
  useStatusContext,
  useStatusIcons,
  useStatusMenuActions,
} from './hooks';
import { RemoveQuoteHint } from './legacy/action_bar/remove_quote_hint';
import classes from './styles.module.scss';

interface StatusActionBarProps {
  statusId: string;
  reblogId: string | undefined;
  withDismiss?: boolean;
  withCounters?: boolean;
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
  reblogId,
  withDismiss,
  withCounters,
}) => {
  const status = useAccountStatus(statusId);
  const reblogStatus = useAccountStatus(reblogId);
  const quotedAccountId = useAppSelector(
    (state) =>
      state.statuses.getIn([status?.quote?.quoted_status, 'account']) ?? null,
  );
  const currentAccountId = useCurrentAccountId();
  const { contextType } = useStatusContext();
  const statusUrl = status?.url ?? status?.uri;
  const { reply, like, bookmark } = useStatusIcons(statusId);
  const intl = useIntl();
  const favouriteTitle = intl.formatMessage(
    status?.favourited ? messages.removeFavourite : messages.favourite,
  );

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

  if (!status) {
    return null;
  }

  const isPublic =
    status.visibility === 'public' || status.visibility === 'unlisted';

  const isQuotingMe = quotedAccountId === currentAccountId;
  const shouldShowQuoteRemovalHint =
    isQuotingMe && contextType === 'notifications';

  return (
    <div className={classes.actions}>
      <Tooltip text={reply.title}>
        {({ getTooltipProps }) => (
          <Button
            {...getTooltipProps()}
            aria-label={reply.title}
            size='sm'
            clipPadding
            variant='ghost'
            leadingIcon={reply.icon}
            onClick={handleReplyClick}
          >
            {withCounters && reply.counter}
          </Button>
        )}
      </Tooltip>

      <StatusReblogButton statusId={statusId}>
        {withCounters && status.reblogs_count}
      </StatusReblogButton>

      <Tooltip text={favouriteTitle}>
        {({ getTooltipProps }) => (
          <ToggleButton
            {...getTooltipProps()}
            aria-label={favouriteTitle}
            size='sm'
            variant='ghost'
            active={status.favourited}
            leadingIcon={like.icon}
            leadingIconWrapperClassName='favourite-animation-target'
            onClick={handleFavouriteClick}
            className={classNames(
              classes.favouriteButton,
              'star-icon',
              classes.actionsButtonGap,
            )}
          >
            {withCounters && like.counter}
          </ToggleButton>
        )}
      </Tooltip>

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
        active={bookmark.active}
        icon={bookmark.icon}
        onClick={bookmark.action}
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
            reblogStatus={reblogStatus}
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
  const intl = useIntl();

  const handleShiftClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        boost.action();
      }
    },
    [boost],
  );

  if (quickBoosting) {
    return (
      <Tooltip text={boost.title}>
        {({ getTooltipProps }) => (
          <ToggleButton
            {...getTooltipProps()}
            aria-label={boost.title}
            size='sm'
            variant='ghost'
            active={boost.active}
            leadingIcon={boost.icon}
            className={classes.reblogButton}
            disabled={boost.disabled}
            onClick={boost.action}
          >
            {children}
          </ToggleButton>
        )}
      </Tooltip>
    );
  }

  return (
    <Menu>
      <Tooltip
        text={
          <FormattedMessage
            id='status.reblog_or_quote'
            defaultMessage='Boost or quote'
          />
        }
      >
        {({ getTooltipProps }) => (
          <MenuTrigger
            {...getTooltipProps()}
            as={ToggleButton}
            size='sm'
            variant='ghost'
            active={boost.active}
            aria-label={intl.formatMessage({
              id: 'status.reblog_or_quote',
              defaultMessage: 'Boost or quote',
            })}
            leadingIcon={boost.icon}
            className={classes.reblogButton}
            onClick={handleShiftClick}
          >
            {children}
          </MenuTrigger>
        )}
      </Tooltip>

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
  reblogStatus: AccountStatusShape | null;
  withDismiss?: boolean;
}> = ({ status, reblogStatus, dismissQuoteHint, withDismiss }) => {
  const { contextType } = useStatusContext();
  const dispatch = useAppDispatch();

  const menu = useStatusMenuActions({
    status,
    reblogStatus,
    contextType,
    withDismiss,
  });

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
