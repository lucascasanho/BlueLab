import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FormattedMessage, defineMessages, useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { ChatCircleDotsIcon } from '@phosphor-icons/react';
import { List as ImmutableList } from 'immutable';

import { Helmet } from '@unhead/react/helmet';

import ReplyIcon from '@/material-icons/400-24px/reply.svg?react';
import StarIcon from '@/material-icons/400-24px/star-fill.svg?react';
import StarBorderIcon from '@/material-icons/400-24px/star.svg?react';

import type { ApiStatusJSON } from '@/mastodon/api_types/statuses';

import { importFetchedStatus } from '@/mastodon/actions/importer';
import { toggleFavourite } from '@/mastodon/actions/interactions';
import { fetchStatus } from '@/mastodon/actions/statuses';
import {
  directComposeInline,
  replyComposeInline,
  resetCompose,
} from '@/mastodon/actions/compose';
import { connectDirectStream } from '@/mastodon/actions/streaming';
import {
  expandConversations,
  fetchConversation,
  fetchConversationMessages,
  markConversationRead,
  mountConversations,
  unmountConversations,
} from '@/mastodon/actions/conversations';
import { dismissComposer } from '@/mastodon/reducers/slices/composer';
import { RedesignComposeForm } from '@/mastodon/features/compose/redesign';
import { Avatar } from '@/mastodon/components/avatar';
import { Column } from '@/mastodon/components/column';
import { ColumnHeader } from '@/mastodon/components/column_header';
import AttachmentList from '@/mastodon/components/attachment_list';
import StatusContent from '@/mastodon/components/status/legacy/content';
import { DisplayNameSimple } from '@/mastodon/components/display_name/simple';
import { RelativeTimestamp } from '@/mastodon/components/relative_timestamp';
import { compareId } from '@/mastodon/compare_id';
import { IconButton } from '@/mastodon/components/icon_button';
import { me } from '@/mastodon/initial_state';
import type { StatusShape } from '@/mastodon/models/status';
import { makeGetStatus } from '@/mastodon/selectors';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import classes from './message_conversation.module.scss';

const messages = defineMessages({
  title: {
    id: 'messages.conversation.title',
    defaultMessage: 'Conversation',
  },
  empty: {
    id: 'messages.conversation.empty',
    defaultMessage: 'This conversation is no longer available.',
  },
});

const getStatus = makeGetStatus();

export const MessageConversation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const [messageStatusIds, setMessageStatusIds] = useState<string[]>([]);
  const [highlightedStatusId, setHighlightedStatusId] = useState<string | null>(
    null,
  );
  const [pendingScrollStatusId, setPendingScrollStatusId] = useState<string | null>(
    null,
  );

  const conversationItems = useAppSelector(
    (state) =>
      state.conversations.get('items') as Immutable.List<
        Immutable.Map<string, unknown>
      >,
  );

  const conversation = useMemo(
    () => conversationItems.find((item) => item.get('id') === id),
    [conversationItems, id],
  );

  const nativeConversationId = conversation?.get('conversation_id') as
    | string
    | null
    | undefined;

  const threadConversations = useMemo(() => {
    if (!conversation) return [];

    const targetParticipants = conversation.get('accounts') as
      | Immutable.List<string>
      | undefined;

    return conversationItems
      .filter((item) => {
        const itemParticipants = item.get('accounts') as
          | Immutable.List<string>
          | undefined;
        const sameParticipants =
          ImmutableList.isList(itemParticipants) &&
          ImmutableList.isList(targetParticipants) &&
          itemParticipants.sort().equals(targetParticipants.sort());

        const sameNativeConversation =
          !!nativeConversationId &&
          item.get('conversation_id') === nativeConversationId;

        return sameParticipants || sameNativeConversation;
      })
      .toArray();
  }, [conversation, conversationItems, nativeConversationId]);

  const participantIds = useMemo(() => {
    const ids = new Set<string>();

    threadConversations.forEach((item) => {
      const accounts = item.get('accounts');

      if (!ImmutableList.isList(accounts)) return;

      accounts.forEach((accountId) => {
        if (typeof accountId === 'string' && accountId !== me) {
          ids.add(accountId);
        }
      });
    });

    return [...ids].sort();
  }, [threadConversations]);

  const accounts = useAppSelector((state) => state.accounts);

  const participantAccounts = useMemo(
    () =>
      participantIds
        .map((accountId) => accounts.get(accountId))
        .filter(
          (account): account is NonNullable<typeof account> =>
            account !== undefined && account !== null,
        ),
    [accounts, participantIds],
  );

  const statuses = useAppSelector((state) =>
    messageStatusIds
      .map((statusId) =>
        // @ts-expect-error Legacy selector is not typed yet.
        getStatus(state, { id: statusId }),
      )
      .filter(Boolean),
  ) as Array<Immutable.Record<StatusShape>>;

  const loadMessages = useCallback(() => {
    if (!id) return Promise.resolve([]);

    return dispatch(fetchConversationMessages(id)).then((statuses) => {
      const fetchedStatusIds = statuses.map((status) => status.id);

      setMessageStatusIds((current) =>
        [...new Set([...current, ...fetchedStatusIds])].sort(compareId),
      );
      return statuses;
    });
  }, [dispatch, id]);

  useEffect(() => {
    dispatch(mountConversations());
    dispatch(expandConversations());
    const disconnect = dispatch(connectDirectStream());

    if (id) {
      dispatch(fetchConversation(id)).catch(() => undefined);
    }

    return () => {
      dispatch(unmountConversations());
      disconnect();
    };
  }, [dispatch, id]);

  const latestThreadStatusId = useMemo(
    () =>
      threadConversations.reduce<string | null>((latest, item) => {
        const statusId = item.get('last_status') as string | null;

        if (!statusId) return latest;
        if (!latest || compareId(statusId, latest) > 0) return statusId;

        return latest;
      }, null),
    [threadConversations],
  );

  const initialLoadConversationIdRef = useRef<string | null>(null);
  const observedThreadStatusIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id || initialLoadConversationIdRef.current === id) return;

    initialLoadConversationIdRef.current = id;
    observedThreadStatusIdRef.current = null;
    setPendingScrollStatusId(null);
    void loadMessages();
  }, [id, loadMessages]);

  useEffect(() => {
    if (!id || !latestThreadStatusId) return;

    const isFirstObservedStatus = observedThreadStatusIdRef.current === null;
    const statusChanged =
      observedThreadStatusIdRef.current !== latestThreadStatusId;

    observedThreadStatusIdRef.current = latestThreadStatusId;

    setMessageStatusIds((current) =>
      current.includes(latestThreadStatusId)
        ? current
        : [...current, latestThreadStatusId].sort(compareId),
    );

    if (!isFirstObservedStatus && statusChanged) {
      void loadMessages();
    }
  }, [id, latestThreadStatusId, loadMessages]);

  useEffect(() => {
    if (id) {
      dispatch(markConversationRead(id));
    }
  }, [dispatch, id]);

  const participantAccountIdsKey = participantIds.join(',');
  const participantAccountsRef = useRef(participantAccounts);
  participantAccountsRef.current = participantAccounts;

  useEffect(() => {
    const recipients = participantAccountsRef.current;

    if (recipients.length === 0) return;

    dispatch(resetCompose());

    recipients.forEach((account) => {
      dispatch(directComposeInline(account));
    });

    dispatch(dismissComposer());

    return () => {
      dispatch(resetCompose());
    };
  }, [dispatch, participantAccountIdsKey]);

  const highlightTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    },
    [],
  );

  const highlightStatus = useCallback((statusId: string) => {
    setHighlightedStatusId(statusId);

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedStatusId(null);
      highlightTimeoutRef.current = null;
    }, 1400);
  }, []);

  const scrollToStatus = useCallback(
    (statusId: string) => {
      const element = document.getElementById('message-' + statusId);

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        highlightStatus(statusId);
        return;
      }

      setMessageStatusIds((current) =>
        current.includes(statusId)
          ? current
          : [...current, statusId].sort(compareId),
      );
      setPendingScrollStatusId(statusId);
      dispatch(
        fetchStatus(statusId, {
          forceFetch: true,
          alsoFetchContext: false,
        }),
      );
    },
    [dispatch, highlightStatus],
  );

  useEffect(() => {
    if (
      !pendingScrollStatusId ||
      !statuses.some((status) => status.get('id') === pendingScrollStatusId)
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(
        'message-' + pendingScrollStatusId,
      );

      if (!element) return;

      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      highlightStatus(pendingScrollStatusId);
      setPendingScrollStatusId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [highlightStatus, pendingScrollStatusId, statuses]);

  const handleReply = useCallback(
    (status: Immutable.Record<StatusShape>) => {
      dispatch(replyComposeInline(status));
    },
    [dispatch],
  );

  if (!conversation || statuses.length === 0) {
    return (
      <Column>
        <ColumnHeader withBackButton title={intl.formatMessage(messages.title)} />
        <div className={classes.empty}>
          <ChatCircleDotsIcon size={42} />
          <span>{intl.formatMessage(messages.empty)}</span>
        </div>
      </Column>
    );
  }

  return (
    <Column
      label={intl.formatMessage(messages.title)}
      className={classes.column}
    >
      <ColumnHeader
        withBackButton
        title={
          <div className={classes.headerTitle}>
            <ChatCircleDotsIcon size={18} />
            <span>
              {participantAccounts.length === 1 && participantAccounts[0] ? (
                <DisplayNameSimple account={participantAccounts[0]} />
              ) : (
                <FormattedMessage
                  id='messages.conversation.participants'
                  defaultMessage='{count, plural, one {Message} other {Conversation}}'
                  values={{ count: participantAccounts.length }}
                />
              )}
            </span>
          </div>
        }
      />

      <div className={classes.page}>
        <div className={classes.messageList}>
          {statuses.map((status) => {
            const isMine = status.getIn(['account', 'id']) === me;
            const displayAccount = status.get('account');
            const statusText =
              typeof status.get('text') === 'string'
                ? (status.get('text') as string)
                : '';
            const mentions = status.get('mentions') as Immutable.List<
              Immutable.Map<string, unknown>
            >;
            const trimmedText = statusText.trimStart();
            const showSenderName =
              mentions?.size > 1 ||
              mentions?.some((mention) => {
                const acct = mention.get('acct');
                const username = mention.get('username');
                const startsWithMention =
                  (typeof acct === 'string' &&
                    trimmedText.startsWith(`@${acct}`)) ||
                  (typeof username === 'string' &&
                    trimmedText.startsWith(`@${username}`));

                return !startsWithMention;
              });

            const replyTargetId = status.get('in_reply_to_id') as
              | string
              | null;
            const replyTarget = replyTargetId
              ? statuses.find((candidate) => candidate.get('id') === replyTargetId)
              : undefined;
            const replyTargetText =
              replyTarget && typeof replyTarget.get('text') === 'string'
                ? (replyTarget.get('text') as string)
                : '';

            return (
              <article
                id={`message-${status.get('id') as string}`}
                key={status.get('id') as string}
                className={
                  highlightedStatusId === (status.get('id') as string)
                    ? classes.message + ' ' + classes.messageHighlighted
                    : classes.message
                }
                data-own-message={isMine ? 'true' : 'false'}
              >
                <div className={classes.messageMeta}>
                  <Avatar account={displayAccount} size={20} />
                  {showSenderName && (
                    <strong>
                      <DisplayNameSimple account={displayAccount} />
                    </strong>
                  )}
                  <RelativeTimestamp timestamp={status.get('created_at')} />
                </div>

                {replyTarget && (
                  <button
                    type='button'
                    className={classes.replyContext}
                    aria-label={intl.formatMessage(
                      {
                        id: 'messages.conversation.replying_to',
                        defaultMessage: 'Replying to {name}',
                      },
                      {
                        name:
                          replyTarget.getIn(['account', 'display_name']) ||
                          replyTarget.getIn(['account', 'username']),
                      },
                    )}
                    onClick={() => scrollToStatus(replyTargetId)}
                  >
                    <span className={classes.replyContextHeader}>
                      <ReplyIcon
                        className={classes.replyContextIcon}
                        aria-hidden='true'
                      />
                      <FormattedMessage
                        id='messages.conversation.replying_to'
                        defaultMessage='Replying to {name}'
                        values={{
                          name: (
                            <DisplayNameSimple
                              account={replyTarget.get('account')}
                            />
                          ),
                        }}
                      />
                    </span>
                    <span className={classes.replyContextText}>
                      {replyTargetText.slice(0, 120) +
                        (replyTargetText.length > 120 ? '…' : '')}
                    </span>
                  </button>
                )}

                <div className={classes.messageBody}>
                  <StatusContent
                    // @ts-expect-error Legacy StatusContent typing.
                    status={status}
                    expanded
                  />
                </div>

                {status.get('media_attachments').size > 0 && (
                  <AttachmentList
                    compact
                    media={status.get('media_attachments')}
                  />
                )}

                <div className={classes.messageActions}>
                  <IconButton
                    className={classes.messageAction}
                    title={intl.formatMessage({
                      id: 'status.reply',
                      defaultMessage: 'Reply',
                    })}
                    icon='reply'
                    iconComponent={ReplyIcon}
                    onClick={() => handleReply(status)}
                  />
                  <IconButton
                    className={
                      classes.messageAction + ' ' + classes.messageFavourite
                    }
                    animate
                    active={!!status.get('favourited')}
                    title={intl.formatMessage(
                      status.get('favourited')
                        ? {
                            id: 'status.remove_favourite',
                            defaultMessage: 'Remove from favorites',
                          }
                        : {
                            id: 'status.favourite',
                            defaultMessage: 'Favorite',
                          },
                    )}
                    icon='star'
                    iconComponent={
                      status.get('favourited') ? StarIcon : StarBorderIcon
                    }
                    onClick={() =>
                      dispatch(toggleFavourite(status.get('id') as string))
                    }
                  />
                </div>
              </article>
            );
          })}
        </div>

        {participantAccounts.length > 0 && (
          <RedesignComposeForm
            className={classes.replyComposer}
            compact
            embedded
            autoFocus
            onSuccess={(status: ApiStatusJSON) => {
              dispatch(importFetchedStatus(status));
              setMessageStatusIds((current) =>
                current.includes(status.id)
                  ? current
                  : [...current, status.id],
              );

              participantAccountsRef.current.forEach((account) => {
                dispatch(directComposeInline(account));
              });
            }}
          />
        )}
      </div>

      <Helmet>
        <title>{intl.formatMessage(messages.title)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};
