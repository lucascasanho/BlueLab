import { useCallback, useEffect, useMemo, useState } from 'react';

import { FormattedMessage, defineMessages, useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { ChatCircleDotsIcon } from '@phosphor-icons/react';
import { Helmet } from '@unhead/react/helmet';

import {
  expandConversations,
  fetchConversationMessages,
  markConversationRead,
  mountConversations,
  unmountConversations,
} from '@/mastodon/actions/conversations';
import { directCompose, resetCompose } from '@/mastodon/actions/compose';
import { dismissComposer } from '@/mastodon/reducers/slices/composer';
import { connectDirectStream } from '@/mastodon/actions/streaming';
import { RedesignComposeForm } from '@/mastodon/features/compose/redesign';
import { Avatar } from '@/mastodon/components/avatar';
import { Column } from '@/mastodon/components/column';
import { ColumnHeader } from '@/mastodon/components/column_header';
import AttachmentList from '@/mastodon/components/attachment_list';
import StatusContent from '@/mastodon/components/status/legacy/content';
import { DisplayNameSimple } from '@/mastodon/components/display_name/simple';
import { RelativeTimestamp } from '@/mastodon/components/relative_timestamp';
import { me } from '@/mastodon/initial_state';
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

  const conversation = useAppSelector((state) =>
    (state.conversations.get('items') as Immutable.List<
      Immutable.Map<string, unknown>
    >).find((item) => item.get('id') === id),
  );

  const lastStatusId = conversation?.get('last_status') as
    | string
    | null
    | undefined;

  const statuses = useAppSelector((state) =>
    messageStatusIds
      .map((statusId) =>
        // @ts-expect-error Legacy selector is not typed yet.
        getStatus(state, { id: statusId }),
      )
      .filter(Boolean),
  ) as unknown as Immutable.List<Immutable.Record<any>>;

  const accounts = useAppSelector((state) => {
    const ids = conversation?.get('accounts') as
      | Immutable.List<string>
      | undefined;

    return ids ? ids.map((accountId) => state.accounts.get(accountId)) : [];
  });

  const recipient = useAppSelector((state) => {
    const ids = conversation?.get('accounts') as
      | Immutable.List<string>
      | undefined;
    const recipientId = ids?.find((accountId) => accountId !== me);

    return recipientId ? state.accounts.get(recipientId) : undefined;
  });

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

  useEffect(() => {
    if (id) {
      void loadMessages();
    }
  }, [id, loadMessages]);

  const latestStatusId = conversation?.get('last_status') as
    | string
    | null
    | undefined;

  useEffect(() => {
    if (!id || !latestStatusId) return;
    void loadMessages();
  }, [id, latestStatusId, loadMessages]);

  useEffect(() => {
    if (id) {
      dispatch(markConversationRead(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!recipient) return;

    dispatch(resetCompose());
    dispatch(directCompose(recipient));
    dispatch(dismissComposer());

    return () => {
      dispatch(resetCompose());
    };
  }, [dispatch, recipient]);

  if (!conversation || statuses.isEmpty()) {
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

  const participantAccounts = accounts.filter(
    (account): account is NonNullable<typeof account> =>
      account !== undefined && account !== null && account.get('id') !== me,
  );

  return (
    <Column label={intl.formatMessage(messages.title)}>
      <ColumnHeader
        withBackButton
        title={
          <div className={classes.headerTitle}>
            <ChatCircleDotsIcon size={18} />
            <span>
              {participantAccounts.size === 1 && participantAccounts.first() ? (
                <DisplayNameSimple account={participantAccounts.first()} />
              ) : (
                <FormattedMessage
                  id='messages.conversation.participants'
                  defaultMessage='{count, plural, one {Message} other {Conversation}}'
                  values={{ count: participantAccounts.size }}
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

            return (
              <article
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
              </article>
            );
          })}
        </div>

        {recipient && (
          <RedesignComposeForm
            className={classes.replyComposer}
            compact
            embedded
            autoFocus
            onSuccess={() => {
              void loadMessages();
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
