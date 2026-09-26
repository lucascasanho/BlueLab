import { useCallback, useEffect, useMemo, useState } from 'react';

import { FormattedMessage, defineMessages, useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { ChatCircleDotsIcon } from '@phosphor-icons/react';

import { Helmet } from '@unhead/react/helmet';

import ReplyIcon from '@/material-icons/400-24px/reply.svg?react';

import type { ApiStatusJSON } from '@/mastodon/api_types/statuses';

import { importFetchedStatus } from '@/mastodon/actions/importer';
import { directCompose, replyCompose, resetCompose } from '@/mastodon/actions/compose';
import { connectDirectStream } from '@/mastodon/actions/streaming';
import {
  expandConversations,
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

import { groupConversations } from '../conversation_grouping';

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

  const conversationGroup = useMemo(() => {
    if (!conversation) return [];

    return (
      groupConversations(conversationItems).find((group) =>
        group.some((item) => item.get('id') === conversation.get('id')),
      ) ?? []
    );
  }, [conversation, conversationItems]);

  const participantIds = useMemo(() => {
    const ids = new Set<string>();

    conversationGroup.forEach((item) => {
      item.get('accounts').forEach((accountId) => {
        if (accountId !== me) ids.add(accountId);
      });
    });

    return [...ids];
  }, [conversationGroup]);

  const participantAccounts = useAppSelector((state) =>
    participantIds
      .map((accountId) => state.accounts.get(accountId))
      .filter(Boolean),
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
      setMessageStatusIds(statuses.map((status) => status.id));
      return statuses;
    });
  }, [dispatch, id]);

  useEffect(() => {
    dispatch(mountConversations());
    dispatch(expandConversations());
    const disconnect = dispatch(connectDirectStream());

    return () => {
      dispatch(unmountConversations());
      disconnect();
    };
  }, [dispatch]);

  const latestMatchingStatusId = useMemo(
    () =>
      conversationGroup.reduce<string | null>((latest, item) => {
        const statusId = item.get('last_status') as string | null;

        if (!statusId) return latest;
        if (!latest || compareId(statusId, latest) > 0) return statusId;

        return latest;
      }, null),
    [conversationGroup],
  );

  useEffect(() => {
    if (!id || !latestMatchingStatusId) return;

    setMessageStatusIds((current) =>
      current.includes(latestMatchingStatusId)
        ? current
        : [...current, latestMatchingStatusId].sort(compareId),
    );

    void loadMessages();
  }, [id, latestMatchingStatusId, loadMessages]);

  useEffect(() => {
    if (id) {
      dispatch(markConversationRead(id));
    }
  }, [dispatch, id]);

  const participantAccountIdsKey = participantIds.join(',');

  useEffect(() => {
    if (participantAccounts.length === 0) return;

    dispatch(resetCompose());

    participantAccounts.forEach((account) => {
      dispatch(directCompose(account));
    });

    dispatch(dismissComposer());

    return () => {
      dispatch(resetCompose());
    };
  }, [dispatch, participantAccountIdsKey, participantAccounts]);

  const handleReply = useCallback(
    (status: Immutable.Record<StatusShape>) => {
      dispatch(resetCompose());
      dispatch(replyCompose(status));
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
    <Column label={intl.formatMessage(messages.title)}>
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
              ? statuses.find((candidate) => candidate.get('id') === replyTargetId)
              : undefined;

            return (
              <article
                id={`message-${status.get('id') as string}`}
                key={status.get('id') as string}
                className={classes.message}
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
                    onClick={() =>
                      document
                        .getElementById(`message-${replyTargetId}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  >
                    <FormattedMessage
                      id='messages.conversation.replying_to'
                      defaultMessage='Replying to {name}: {text}'
                      values={{
                        name: (
                          <DisplayNameSimple
                            account={replyTarget.get('account')}
                          />
                        ),
                        text: (
                          (replyTarget.get('text') as string).slice(0, 80) +
                          ((replyTarget.get('text') as string).length > 80
                            ? '…'
                            : '')
                        ),
                      }}
                    />
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

                <IconButton
                  className={classes.replyButton}
                  title={intl.formatMessage({
                    id: 'status.reply',
                    defaultMessage: 'Reply',
                  })}
                  icon='reply'
                  iconComponent={ReplyIcon}
                  onClick={() => handleReply(status)}
                />
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
