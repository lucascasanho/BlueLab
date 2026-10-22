import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FormattedMessage, defineMessages, useIntl } from 'react-intl';

import classNames from 'classnames';
import { useLocation, useParams } from 'react-router-dom';

import { List as ImmutableList } from 'immutable';
import type { Map as ImmutableMap, Record as ImmutableRecord } from 'immutable';

import { ChatCircleDotsIcon, HeartIcon } from '@phosphor-icons/react';
import { Helmet } from '@unhead/react/helmet';

import {
  directComposeInline,
  replyComposeInline,
  resetCompose,
} from '@/mastodon/actions/compose';
import {
  expandConversations,
  fetchConversation,
  findConversationForStatus,
  fetchConversationMessages,
  markConversationRead,
  mountConversations,
  unmountConversations,
} from '@/mastodon/actions/conversations';
import { importFetchedStatus } from '@/mastodon/actions/importer';
import { toggleFavourite } from '@/mastodon/actions/interactions';
import { fetchStatus } from '@/mastodon/actions/statuses';
import { connectDirectStream } from '@/mastodon/actions/streaming';
import type { ApiStatusJSON } from '@/mastodon/api_types/statuses';
import { compareId } from '@/mastodon/compare_id';
import AttachmentList from '@/mastodon/components/attachment_list';
import { Avatar } from '@/mastodon/components/avatar';
import { Column } from '@/mastodon/components/column';
import { ColumnHeader } from '@/mastodon/components/column_header';
import { DisplayNameSimple } from '@/mastodon/components/display_name/simple';
import { EmojiHTML } from '@/mastodon/components/emoji/html';
import { IconButton } from '@/mastodon/components/icon_button';
import { LoadingIndicator } from '@/mastodon/components/loading_indicator';
import { RelativeTimestamp } from '@/mastodon/components/relative_timestamp';
import { browserHistory } from '@/mastodon/components/router';
import StatusContent from '@/mastodon/components/status/legacy/content';
import { RedesignComposeForm } from '@/mastodon/features/compose/redesign';
import { me } from '@/mastodon/initial_state';
import type { Account } from '@/mastodon/models/account';
import type { StatusShape } from '@/mastodon/models/status';
import { dismissComposer } from '@/mastodon/reducers/slices/composer';
import { makeGetStatus } from '@/mastodon/selectors';
import type { RootState } from '@/mastodon/store';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import ReplyIcon from '@/material-icons/400-24px/reply.svg?react';
import StarIcon from '@/material-icons/400-24px/star-fill.svg?react';
import StarBorderIcon from '@/material-icons/400-24px/star.svg?react';

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

type MessageAlignment = 'center' | 'end';

function scrollMessageWithinList(
  list: HTMLElement,
  message: HTMLElement,
  alignment: MessageAlignment,
  behavior: ScrollBehavior = 'auto',
) {
  const listRect = list.getBoundingClientRect();
  const messageRect = message.getBoundingClientRect();
  const messageTop = list.scrollTop + messageRect.top - listRect.top;
  const targetTop =
    alignment === 'end'
      ? messageTop + messageRect.height - list.clientHeight
      : messageTop - (list.clientHeight - messageRect.height) / 2;
  const maxScrollTop = Math.max(0, list.scrollHeight - list.clientHeight);
  const top = Math.max(0, Math.min(maxScrollTop, targetTop));

  list.scrollTo({ top, behavior });
}

interface MessageConversationProps {
  conversationId?: string;
  onBack?: () => void;
  inline?: boolean;
  vanillaAppearance?: boolean;
}

export const MessageConversation: React.FC<MessageConversationProps> = ({
  conversationId,
  onBack,
  inline = false,
  vanillaAppearance,
}) => {
  const theme =
    typeof document !== 'undefined' ? document.body.dataset.theme : undefined;
  const useVanillaAppearance =
    vanillaAppearance ?? (!theme || theme === 'default');
  const { id: routeId } = useParams<{ id: string }>();
  const id = conversationId ?? routeId;
  const location = useLocation<{ statusId?: string }>();
  const sourceStatusId = location.state.statusId;
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const [messageStatusIds, setMessageStatusIds] = useState<string[]>([]);
  const [conversationResolvedId, setConversationResolvedId] = useState<
    string | null
  >(null);
  const [messagesResolvedId, setMessagesResolvedId] = useState<string | null>(
    null,
  );
  const conversationResolved = !id || conversationResolvedId === id;
  const messagesResolved = !id || messagesResolvedId === id;
  const [highlightedStatusId, setHighlightedStatusId] = useState<string | null>(
    null,
  );
  const [pendingScroll, setPendingScroll] = useState<{
    conversationId: string;
    statusId: string;
  } | null>(null);
  const pendingScrollStatusId =
    pendingScroll?.conversationId === id ? pendingScroll.statusId : null;

  const conversationItems = useAppSelector((state) => {
    const conversationsState = state.conversations as unknown as ImmutableMap<
      string,
      unknown
    >;

    return conversationsState.get('items') as ImmutableList<
      ImmutableMap<string, unknown>
    >;
  });

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
      | ImmutableList<string>
      | undefined;

    return conversationItems
      .filter((item) => {
        const itemParticipants = item.get('accounts') as
          | ImmutableList<string>
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
        .filter(Boolean),
    [accounts, participantIds],
  );

  const loadMessages = useCallback(() => {
    if (!id) return Promise.resolve([]);

    const applyStatuses = (statuses: { id: string }[]) => {
      const fetchedStatusIds = statuses.map((status) => status.id);

      setMessageStatusIds((current) =>
        [...new Set([...current, ...fetchedStatusIds])].sort(compareId),
      );
      return statuses;
    };

    const fetchMessages = (conversationId: string) =>
      dispatch(fetchConversationMessages(conversationId)) as unknown as Promise<
        { id: string }[]
      >;

    return fetchMessages(id)
      .then(applyStatuses)
      .catch(async (error: unknown) => {
        if (!sourceStatusId) throw error;

        const recoveredId = (await dispatch(
          findConversationForStatus(sourceStatusId),
        )) as string | null | undefined;

        if (!recoveredId || recoveredId === id) throw error;

        browserHistory.replace(`/conversations/${recoveredId}`, {
          statusId: sourceStatusId,
        });

        const statuses = await fetchMessages(recoveredId);
        return applyStatuses(statuses);
      });
  }, [dispatch, id, sourceStatusId]);

  useEffect(() => {
    if (!inline) {
      dispatch(mountConversations());
      dispatch(expandConversations());
    }

    const disconnect = inline ? undefined : dispatch(connectDirectStream());

    const cancelled: { current: boolean } = { current: false };
    const isCancelled = (): boolean => cancelled.current;

    if (id) {
      const requestedId = id;

      void dispatch(fetchConversation(requestedId))
        .catch(async () => {
          if (!sourceStatusId || isCancelled()) return;

          try {
            const recoveredId = (await dispatch(
              findConversationForStatus(sourceStatusId),
            )) as string | null | undefined;

            if (!isCancelled() && recoveredId && recoveredId !== id) {
              browserHistory.replace(`/conversations/${recoveredId}`, {
                statusId: sourceStatusId,
              });
            }
          } catch {
            // Keep the existing unavailable state when recovery also fails.
          }
        })
        .finally(() => {
          if (!isCancelled()) setConversationResolvedId(requestedId);
        });
    }

    return () => {
      cancelled.current = true;
      if (!inline) {
        dispatch(unmountConversations());
        disconnect?.();
      }
    };
  }, [dispatch, id, inline, sourceStatusId]);

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

  const effectiveMessageStatusIds = useMemo(() => {
    if (
      !latestThreadStatusId ||
      messageStatusIds.includes(latestThreadStatusId)
    ) {
      return messageStatusIds;
    }

    return [...messageStatusIds, latestThreadStatusId].sort(compareId);
  }, [latestThreadStatusId, messageStatusIds]);

  const statuses = useAppSelector<RootState, ImmutableRecord<StatusShape>[]>(
    (state) =>
      effectiveMessageStatusIds
        .map((statusId) => {
          // The legacy selector also reads contextType from the same props object.
          const selectorProps = { id: statusId, contextType: undefined };
          return getStatus(state, selectorProps) as
            | ImmutableRecord<StatusShape>
            | null
            | undefined;
        })
        .filter(
          (status): status is ImmutableRecord<StatusShape> =>
            status !== null && status !== undefined,
        ),
  );

  const initialLoadConversationIdRef = useRef<string | null>(null);
  const observedThreadStatusIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id || initialLoadConversationIdRef.current === id) return;

    initialLoadConversationIdRef.current = id;
    observedThreadStatusIdRef.current = null;

    let cancelled = false;
    void loadMessages()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setMessagesResolvedId(id);
      });

    return () => {
      cancelled = true;
    };
  }, [id, loadMessages]);

  useEffect(() => {
    if (!id || !latestThreadStatusId) return;

    const isFirstObservedStatus = observedThreadStatusIdRef.current === null;
    const statusChanged =
      observedThreadStatusIdRef.current !== latestThreadStatusId;

    observedThreadStatusIdRef.current = latestThreadStatusId;

    if (!isFirstObservedStatus && statusChanged) {
      void loadMessages();
    }
  }, [id, latestThreadStatusId, loadMessages]);

  const initialReadStateRef = useRef<{
    conversationId: string;
    unread: boolean;
    lastReadStatusId: string | null;
  } | null>(null);

  useEffect(() => {
    if (
      !id ||
      !conversation ||
      initialReadStateRef.current?.conversationId === id
    ) {
      return;
    }

    initialReadStateRef.current = {
      conversationId: id,
      unread: Boolean(conversation.get('unread')),
      lastReadStatusId:
        (conversation.get('last_read_status_id') as string | null) ?? null,
    };
  }, [conversation, id]);

  useEffect(() => {
    if (id && conversationResolved && conversation) {
      void dispatch(markConversationRead(id)).catch(() => undefined);
    }
  }, [conversation, conversationResolved, dispatch, id]);

  const renderShell = (content: React.ReactNode) => {
    const conversationContent = (
      <div className={classes.columnContent} data-message-conversation='true'>
        {content}
      </div>
    );

    if (inline) {
      return (
        <div className={`${classes.column} ${classes.inlineColumn}`}>
          {conversationContent}
        </div>
      );
    }

    return (
      <Column
        label={intl.formatMessage(messages.title)}
        className={classes.column}
      >
        {conversationContent}
      </Column>
    );
  };

  const participantAccountIdsKey = participantIds.join(',');
  const participantAccountsRef = useRef(participantAccounts);

  useEffect(() => {
    participantAccountsRef.current = participantAccounts;
  }, [participantAccounts]);

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

  const messageListRef = useRef<HTMLDivElement>(null);

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
        const list = messageListRef.current;
        if (list) {
          scrollMessageWithinList(list, element, 'center', 'smooth');
        } else {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        highlightStatus(statusId);
        return;
      }

      setMessageStatusIds((current) =>
        current.includes(statusId)
          ? current
          : [...current, statusId].sort(compareId),
      );
      setPendingScroll({ conversationId: id, statusId });
      dispatch(
        fetchStatus(statusId, {
          forceFetch: true,
          alsoFetchContext: false,
        }),
      );
    },
    [dispatch, highlightStatus, id],
  );

  const handleReplyContextKeyDown = useCallback<
    React.KeyboardEventHandler<HTMLDivElement>
  >(
    (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const statusId = event.currentTarget.dataset.statusId;
      if (!statusId) return;

      event.preventDefault();
      scrollToStatus(statusId);
    },
    [scrollToStatus],
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

      const list = messageListRef.current;
      if (!element || !list) return;

      scrollMessageWithinList(list, element, 'center', 'smooth');
      highlightStatus(pendingScrollStatusId);
      setPendingScroll(null);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [highlightStatus, pendingScrollStatusId, statuses]);

  const initialScrollConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !id ||
      !conversationResolved ||
      !conversation ||
      !messagesResolved ||
      (statuses.length === 0 && !sourceStatusId)
    ) {
      return;
    }

    if (initialScrollConversationIdRef.current === id) return;

    if (sourceStatusId) {
      const frame = window.requestAnimationFrame(() => {
        scrollToStatus(sourceStatusId);
        initialScrollConversationIdRef.current = id;
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    const initialReadState = initialReadStateRef.current;
    const lastStatus = statuses[statuses.length - 1];
    const lastReadStatusId = initialReadState?.lastReadStatusId;

    // Conversation statuses are ordered oldest to newest. Start at the latest
    // incoming status after the read marker, not at the start of the thread.
    const latestUnreadStatus =
      initialReadState?.unread === true
        ? [...statuses].reverse().find((status) => {
            const statusId = status.get<'id'>('id');
            const isIncoming = status.getIn(['account', 'id']) !== me;

            return (
              isIncoming &&
              (!lastReadStatusId || compareId(statusId, lastReadStatusId) > 0)
            );
          })
        : undefined;

    const targetStatus = latestUnreadStatus ?? lastStatus;

    if (!targetStatus) return;

    let frame = 0;
    let secondFrame = 0;

    frame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const list = messageListRef.current;
        const targetMessage = document.getElementById(
          'message-' + targetStatus.get('id'),
        );

        if (!list) return;

        if (targetMessage) {
          scrollMessageWithinList(
            list,
            targetMessage,
            latestUnreadStatus ? 'center' : 'end',
          );
        } else {
          list.scrollTop = latestUnreadStatus ? 0 : list.scrollHeight;
        }

        initialScrollConversationIdRef.current = id;
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [
    conversation,
    conversationResolved,
    id,
    messagesResolved,
    scrollToStatus,
    sourceStatusId,
    statuses,
  ]);

  const handleReply = useCallback(
    (status: ImmutableRecord<StatusShape>) => {
      dispatch(replyComposeInline(status));
    },
    [dispatch],
  );

  const createScrollToStatusHandler = useCallback(
    (statusId: string | null) => () => {
      if (statusId) scrollToStatus(statusId);
    },
    [scrollToStatus],
  );

  const createReplyHandler = useCallback(
    (status: ImmutableRecord<StatusShape>) => () => {
      handleReply(status);
    },
    [handleReply],
  );

  const createFavouriteHandler = useCallback(
    (statusId: string) => () => {
      dispatch(toggleFavourite(statusId));
    },
    [dispatch],
  );

  const handleReplyComposeSuccess = useCallback(
    (status: ApiStatusJSON) => {
      dispatch(importFetchedStatus(status));
      setMessageStatusIds((current) =>
        current.includes(status.id)
          ? current
          : [...current, status.id].sort(compareId),
      );

      participantAccountsRef.current.forEach((account) => {
        dispatch(directComposeInline(account));
      });
    },
    [dispatch],
  );

  if (!conversationResolved || !messagesResolved) {
    return renderShell(
      <>
        <ColumnHeader
          withBackButton
          onBackButtonClick={onBack}
          title={intl.formatMessage(messages.title)}
        />
        <div className={classes.loading}>
          <LoadingIndicator />
        </div>
      </>,
    );
  }

  if (!conversation || statuses.length === 0) {
    return renderShell(
      <>
        <ColumnHeader
          withBackButton
          onBackButtonClick={onBack}
          title={intl.formatMessage(messages.title)}
        />
        <div className={classes.empty}>
          <ChatCircleDotsIcon size={42} />
          <span>{intl.formatMessage(messages.empty)}</span>
        </div>
      </>,
    );
  }

  return renderShell(
    <>
      <ColumnHeader
        withBackButton
        onBackButtonClick={onBack}
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
        <div className={classes.messageList} ref={messageListRef}>
          <div className={classes.messageListContent}>
            {statuses.map((status) => {
              const isMine = status.getIn(['account', 'id']) === me;
              const displayAccount = status.get(
                'account',
              ) as unknown as Account;
              const mediaAttachments = status.get(
                'media_attachments',
              ) as unknown as ImmutableList<ImmutableMap<string, unknown>>;
              const rawStatusText = status.get<'content'>('content');
              const statusText =
                typeof rawStatusText === 'string' ? rawStatusText : '';
              const mentions = status.get(
                'mentions',
              ) as unknown as ImmutableList<ImmutableMap<string, unknown>>;
              const trimmedText = statusText.trimStart();
              const showSenderName =
                mentions.size > 1 ||
                mentions.some((mention) => {
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
                ? statuses.find(
                    (candidate) => candidate.get('id') === replyTargetId,
                  )
                : undefined;
              const rawReplyTargetHtml =
                replyTarget?.getIn(['translation', 'contentHtml']) ??
                replyTarget?.get('contentHtml');
              const replyTargetHtml =
                typeof rawReplyTargetHtml === 'string'
                  ? rawReplyTargetHtml
                  : '';
              const replyTargetEmojis = replyTarget?.get('emojis');
              const replyTargetLanguage = replyTarget?.get('language');
              const replyTargetAccount = replyTarget?.get(
                'account',
              ) as unknown as Account | undefined;

              return (
                <article
                  id={`message-${status.get<'id'>('id')}`}
                  key={status.get<'id'>('id')}
                  className={classNames(
                    classes.message,
                    highlightedStatusId === status.get<'id'>('id')
                      ? classes.messageHighlighted
                      : undefined,
                  )}
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
                    <div
                      className={classes.replyContext}
                      role='button'
                      tabIndex={0}
                      data-status-id={replyTargetId ?? undefined}
                      aria-label={intl.formatMessage(
                        {
                          id: 'messages.conversation.replying_to',
                          defaultMessage: 'Replying to {name}',
                        },
                        {
                          name:
                            replyTargetAccount?.display_name ??
                            replyTargetAccount?.username ??
                            '',
                        },
                      )}
                      onClick={createScrollToStatusHandler(replyTargetId)}
                      onKeyDown={handleReplyContextKeyDown}
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
                              <DisplayNameSimple account={replyTargetAccount} />
                            ),
                          }}
                        />
                      </span>
                      <EmojiHTML
                        as='div'
                        className={classes.replyContextText}
                        htmlString={replyTargetHtml}
                        extraEmojis={replyTargetEmojis}
                        lang={
                          typeof replyTargetLanguage === 'string'
                            ? replyTargetLanguage
                            : undefined
                        }
                      />
                    </div>
                  )}

                  <div className={classes.messageBody}>
                    <StatusContent
                      // @ts-expect-error Legacy StatusContent typing.
                      status={status}
                      expanded
                    />
                  </div>

                  {mediaAttachments.size > 0 && (
                    <AttachmentList compact media={mediaAttachments} />
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
                      onClick={createReplyHandler(status)}
                    />
                    {useVanillaAppearance ? (
                      <button
                        type='button'
                        className={classNames(
                          classes.messageAction,
                          classes.messageFavouriteVanilla,
                        )}
                        aria-label={intl.formatMessage(
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
                        aria-pressed={status.get('favourited')}
                        onClick={createFavouriteHandler(status.get<'id'>('id'))}
                      >
                        <HeartIcon
                          weight={status.get('favourited') ? 'fill' : 'regular'}
                          size={18}
                          aria-hidden='true'
                        />
                      </button>
                    ) : (
                      <IconButton
                        className={classNames(
                          classes.messageAction,
                          classes.messageFavourite,
                          'star-icon',
                        )}
                        animate
                        active={status.get('favourited')}
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
                        onClick={createFavouriteHandler(status.get<'id'>('id'))}
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {participantAccounts.length > 0 && (
          <RedesignComposeForm
            className={classes.replyComposer}
            compact
            embedded
            autoFocus
            vanillaAppearance={useVanillaAppearance}
            onSuccess={handleReplyComposeSuccess}
          />
        )}
      </div>

      <Helmet>
        <title>{intl.formatMessage(messages.title)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </>,
  );
};
