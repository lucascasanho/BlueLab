import { useCallback, useMemo } from 'react';
import type { MouseEvent } from 'react';

import classNames from 'classnames';

import { replyComposeById } from '@/mastodon/actions/compose_typed';
import { LinkedDisplayName } from '@/mastodon/components/display_name';
import { openConversationForStatus } from 'mastodon/actions/conversations';
import { toggleReblog, toggleFavourite } from 'mastodon/actions/interactions';
import {
  navigateToStatus,
  toggleStatusSpoilers,
} from 'mastodon/actions/statuses';
import { Hotkeys } from 'mastodon/components/hotkeys';
import type { IconProp } from 'mastodon/components/icon';
import { Icon } from 'mastodon/components/icon';
import { Status } from 'mastodon/components/status';
import { getStatusHidden } from 'mastodon/selectors/filters';
import { useAppSelector, useAppDispatch } from 'mastodon/store';

import type { LabelRenderer } from './notification_group_with_status';

export const NotificationWithStatus: React.FC<{
  type: string;
  icon: IconProp;
  iconId: string;
  accountIds: string[];
  statusId: string | undefined;
  count: number;
  labelRenderer: LabelRenderer;
  unread: boolean;
}> = ({
  icon,
  iconId,
  accountIds,
  statusId,
  count,
  labelRenderer,
  type,
  unread,
}) => {
  const dispatch = useAppDispatch();

  const account = useAppSelector((state) =>
    state.accounts.get(accountIds.at(0) ?? ''),
  );
  const label = useMemo(
    () =>
      labelRenderer(
        <LinkedDisplayName displayProps={{ account, variant: 'simple' }} />,
        count,
      ),
    [labelRenderer, account, count],
  );

  const isPrivateMention = useAppSelector(
    (state) => state.statuses.getIn([statusId, 'visibility']) === 'direct',
  );

  const handlePrivateStatusClickCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (
        !isPrivateMention ||
        !statusId ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const target = event.target;
      const statusElement = target.closest<HTMLElement>('article[data-id]');
      if (!statusElement || statusElement.dataset.id !== statusId) return;

      if (
        target.closest(
          'button,input,textarea,select,[role="button"],[role="switch"],[role="checkbox"],[contenteditable="true"]',
        )
      ) {
        return;
      }

      const link = target.closest<HTMLAnchorElement>('a[href]');
      if (link) {
        const destination = new URL(link.href, window.location.href);
        const path = destination.pathname.replace(/\/+$/, '');
        if (!path.endsWith(`/${statusId}`)) return;
      }

      // On touch devices, a tap on the status text can follow its permalink
      // instead of the notification's conversation action. Keep direct-message
      // previews on the conversation route while preserving profile links and actions.
      event.preventDefault();
      event.stopPropagation();
      dispatch(openConversationForStatus(statusId));
    },
    [dispatch, isPrivateMention, statusId],
  );

  const isFiltered = useAppSelector(
    (state) =>
      statusId &&
      getStatusHidden(state, { id: statusId, contextType: 'notifications' }),
  );

  const handleCardClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!(event.target instanceof Element)) return;
      if (
        event.target.closest(
          'a,button,input,textarea,select,[role="link"],[role="button"],.status',
        )
      )
        return;
      if (!statusId) return;

      if (isPrivateMention) {
        dispatch(openConversationForStatus(statusId));
      } else {
        dispatch(navigateToStatus(statusId));
      }
    },
    [dispatch, isPrivateMention, statusId],
  );

  const handlers = useMemo(
    () => ({
      open: () => {
        if (isPrivateMention) {
          dispatch(openConversationForStatus(statusId));
        } else {
          dispatch(navigateToStatus(statusId));
        }
      },

      reply: () => {
        dispatch(replyComposeById({ statusId }));
      },

      boost: () => {
        dispatch(toggleReblog(statusId));
      },

      favourite: () => {
        dispatch(toggleFavourite(statusId));
      },

      toggleHidden: () => {
        dispatch(toggleStatusSpoilers(statusId));
      },
    }),
    [dispatch, isPrivateMention, statusId],
  );

  const handleStatusOpen = useCallback(() => {
    if (!statusId) return;

    if (isPrivateMention) {
      dispatch(openConversationForStatus(statusId));
    } else {
      dispatch(navigateToStatus(statusId));
    }
  }, [dispatch, isPrivateMention, statusId]);

  const handleCardKeyDown = useCallback<
    React.KeyboardEventHandler<HTMLDivElement>
  >(
    (event) => {
      if (event.target !== event.currentTarget) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      handleStatusOpen();
    },
    [handleStatusOpen],
  );

  if (!statusId || isFiltered) return null;

  return (
    <Hotkeys handlers={handlers}>
      <div
        role='button'
        className={classNames(
          `notification-ungrouped focusable notification-ungrouped--${type}`,
          {
            'notification-ungrouped--unread': unread,
            'notification-ungrouped--direct': isPrivateMention,
          },
        )}
        tabIndex={0}
        onClickCapture={handlePrivateStatusClickCapture}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
      >
        <h2 className='notification-ungrouped__header'>
          <div className='notification-ungrouped__header__icon'>
            <Icon icon={icon} id={iconId} />
          </div>
          <span>{label}</span>
        </h2>

        <Status
          id={statusId}
          contextType='notifications'
          onOpen={handleStatusOpen}
          withDismiss
          skipPrepend
          avatarSize={40}
          unfocusable
        />
      </div>
    </Hotkeys>
  );
};
