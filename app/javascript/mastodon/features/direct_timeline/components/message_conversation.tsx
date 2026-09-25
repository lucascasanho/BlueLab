import { useEffect } from 'react';

import { FormattedMessage, defineMessages, useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { ArrowUUpLeftIcon, ChatCircleDotsIcon } from '@phosphor-icons/react';
import { Helmet } from '@unhead/react/helmet';

import {
  expandConversations,
  markConversationRead,
  mountConversations,
  unmountConversations,
} from '@/mastodon/actions/conversations';
import { openNewComposer } from '@/mastodon/reducers/slices/composer';
import { Button } from '@/mastodon/components/button/redesign';
import { Column } from '@/mastodon/components/column';
import { ColumnHeader } from '@/mastodon/components/column_header';
import AttachmentList from '@/mastodon/components/attachment_list';
import AvatarComposite from '@/mastodon/components/avatar_composite';
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
  reply: {
    id: 'messages.conversation.reply',
    defaultMessage: 'Reply',
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

  const conversation = useAppSelector((state) =>
    (state.conversations.get('items') as Immutable.List<
      Immutable.Map<string, unknown>
    >).find((item) => item.get('id') === id),
  );

  const lastStatusId = conversation?.get('last_status') as
    | string
    | null
    | undefined;

  const status = useAppSelector((state) =>
    lastStatusId
      ? // @ts-expect-error Legacy selector is not typed yet.
        getStatus(state, { id: lastStatusId })
      : undefined,
  );

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

  useEffect(() => {
    dispatch(mountConversations());
    dispatch(expandConversations());

    return () => {
      dispatch(unmountConversations());
    };
  }, [dispatch]);

  useEffect(() => {
    if (id) {
      dispatch(markConversationRead(id));
    }
  }, [dispatch, id]);

  if (!conversation || !status) {
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

  const isMine = status.getIn(['account', 'id']) === me;

  const handleReply = () => {
    if (!recipient) return;

    dispatch(
      openNewComposer({
        type: 'message',
        toAccountId: recipient.get('id') as string,
      }),
    );
  };

  const participantAccounts = accounts.filter(
    (account): account is NonNullable<typeof account> =>
      account !== undefined && account !== null && account.get('id') !== me,
  );

  const displayAccount = status.get('account');

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
          <article
            className={classes.message}
            data-own-message={isMine ? 'true' : 'false'}
          >
            <div className={classes.messageMeta}>
              <AvatarComposite
                accounts={
                  isMine
                    ? accounts.filter((account) => account?.get('id') === me)
                    : participantAccounts
                }
                size={36}
              />
              <div>
                <strong>
                  <DisplayNameSimple account={displayAccount} />
                </strong>
                <RelativeTimestamp timestamp={status.get('created_at')} />
              </div>
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
        </div>

        <Button
          variant='solid'
          color='accent'
          onClick={handleReply}
          disabled={!recipient}
        >
          <ArrowUUpLeftIcon size={18} />
          {intl.formatMessage(messages.reply)}
        </Button>
      </div>

      <Helmet>
        <title>{intl.formatMessage(messages.title)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};
