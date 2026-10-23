import { useCallback, useMemo } from 'react';
import type { JSX, KeyboardEvent, MouseEvent } from 'react';

import classNames from 'classnames';

import { replyComposeById } from '@/mastodon/actions/compose_typed';
import { LinkedDisplayName } from '@/mastodon/components/display_name';
import { StatusContext } from '@/mastodon/components/status/hooks';
import { QuotedStatus } from '@/mastodon/components/status/quote';
import { openConversationForStatus } from 'mastodon/actions/conversations';
import { navigateToStatus } from 'mastodon/actions/statuses';
import { Avatar } from 'mastodon/components/avatar';
import { AvatarGroup } from 'mastodon/components/avatar_group';
import { Hotkeys } from 'mastodon/components/hotkeys';
import type { IconProp } from 'mastodon/components/icon';
import { Icon } from 'mastodon/components/icon';
import { RelativeTimestamp } from 'mastodon/components/relative_timestamp';
import { NOTIFICATIONS_GROUP_MAX_AVATARS } from 'mastodon/models/notification_group';
import { useAppSelector, useAppDispatch } from 'mastodon/store';

const AVATAR_SIZE = 28;

export const AvatarById: React.FC<{ accountId: string }> = ({ accountId }) => {
  const account = useAppSelector((state) => state.accounts.get(accountId));

  if (!account) return null;

  return <Avatar withLink account={account} size={AVATAR_SIZE} />;
};

export type LabelRenderer = (
  displayedName: JSX.Element,
  total: number,
  seeMoreHref?: string,
) => JSX.Element;

export const NotificationGroupWithStatus: React.FC<{
  icon: IconProp;
  iconId: string;
  iconClassName?: string;
  statusId?: string;
  actions?: JSX.Element;
  count: number;
  accountIds: string[];
  timestamp: string;
  labelRenderer: LabelRenderer;
  labelSeeMoreHref?: string;
  type: string;
  unread: boolean;
  additionalContent?: JSX.Element;
}> = ({
  icon,
  iconId,
  iconClassName,
  timestamp,
  accountIds,
  actions,
  count,
  statusId,
  labelRenderer,
  labelSeeMoreHref,
  type,
  unread,
  additionalContent,
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
        labelSeeMoreHref,
      ),
    [labelRenderer, account, count, labelSeeMoreHref],
  );

  const isPrivateMention = useAppSelector(
    (state) => state.statuses.getIn([statusId, 'visibility']) === 'direct',
  );

  const openCard = useCallback(() => {
    if (!statusId) return;

    if (isPrivateMention) {
      dispatch(openConversationForStatus(statusId));
    } else {
      dispatch(navigateToStatus(statusId));
    }
  }, [dispatch, isPrivateMention, statusId]);

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
      if (
        target.closest(
          'button,input,textarea,select,[role="button"],[role="switch"],[role="checkbox"],[contenteditable="true"]',
        )
      ) {
        return;
      }

      const link = target.closest<HTMLAnchorElement>('a[href]');
      if (!link) return;

      const destination = new URL(link.href, window.location.href);
      const path = destination.pathname.replace(/\\/+$/, '');
      if (!path.endsWith(`/${statusId}`)) return;

      // A direct-message preview contains a permalink that would otherwise
      // bypass the card handler and open the status page, especially on touch.
      event.preventDefault();
      event.stopPropagation();
      dispatch(openConversationForStatus(statusId));
    },
    [dispatch, isPrivateMention, statusId],
  );

  const handleCardClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!(event.target instanceof Element)) return;
      if (
        event.target.closest(
          'a,button,input,textarea,select,[role="link"],[role="button"]',
        )
      ) {
        return;
      }

      openCard();
    },
    [openCard],
  );

  const handleCardKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      event.stopPropagation();
      openCard();
    },
    [openCard],
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
    }),
    [dispatch, isPrivateMention, statusId],
  );

  return (
    <Hotkeys handlers={handlers}>
      <div
        role='button'
        className={classNames(
          `notification-group focusable notification-group--${type}`,
          {
            'notification-group--unread': unread,
            'notification-group--direct': isPrivateMention,
          },
        )}
        tabIndex={0}
        onClickCapture={handlePrivateStatusClickCapture}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
      >
        <div className='notification-group__icon'>
          <Icon icon={icon} id={iconId} className={iconClassName} />
        </div>

        <div className='notification-group__main'>
          <div className='notification-group__main__header'>
            <div className='notification-group__main__header__wrapper'>
              <AvatarGroup avatarHeight={AVATAR_SIZE}>
                {accountIds
                  .slice(0, NOTIFICATIONS_GROUP_MAX_AVATARS)
                  .map((id) => (
                    <AvatarById key={id} accountId={id} />
                  ))}
              </AvatarGroup>

              {actions && (
                <div className='notification-group__actions'>{actions}</div>
              )}
            </div>

            <h2 className='notification-group__main__header__label'>
              <span>{label}</span>
              {timestamp && (
                <>
                  <span className='notification-group__main__header__label-separator'>
                    &middot;
                  </span>
                  <RelativeTimestamp timestamp={timestamp} />
                </>
              )}
            </h2>
          </div>

          {statusId && (
            <StatusContext.Provider
              value={{ id: statusId, contextType: 'notifications' }}
            >
              <QuotedStatus id={statusId} clamp />
            </StatusContext.Provider>
          )}

          {additionalContent && (
            <div className='notification-group__main__additional-content'>
              {additionalContent}
            </div>
          )}
        </div>
      </div>
    </Hotkeys>
  );
};
