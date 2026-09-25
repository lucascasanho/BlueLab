import { useEffect } from 'react';

import { FormattedMessage, useIntl, defineMessages } from 'react-intl';
import { useParams } from 'react-router-dom';

import { ChatCircleDotsIcon, ReplyIcon } from '@phosphor-icons/react';
import { Helmet } from '@unhead/react/helmet';

import { Button } from '@/mastodon/components/button/redesign';
import { Column } from '@/mastodon/components/column';
import { ColumnHeader } from '@/mastodon/components/column_header';
import StatusContent from '@/mastodon/components/status/legacy/content';
import AttachmentList from '@/mastodon/components/attachment_list';
import AvatarComposite from '@/mastodon/components/avatar_composite';
import { DisplayNameSimple } from '@/mastodon/components/display_name/simple';
import { RelativeTimestamp } from '@/mastodon/components/relative_timestamp';
import { me } from '@/mastodon/initial_state';
import { makeGetStatus } from '@/mastodon/selectors';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import { openNewComposer } from '@/mastodon/reducers/slices/composer';
import { markConversationRead } from '@/mastodon/actions/conversations';

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
    (state.conversations.get('items') as Immutable.List<Immutable.Map<string, unknown>>).find(
      (item) => item.get('id') === id,
    ),
  );

  const lastStatusId = conversation?.get('last_status') as string | null | undefined;
  const accountIds =
    (conversation?.get('accounts') as Immutable.List<string> | undefined) ??
    (globalThis as { Immutable?: { List: new () => unknown } }).Immutable;
  const status = useAppSelector((state) =>
    lastStatusId
      ? // @ts-expect-error legacy selector typing
        getStatus(state, { id: lastStatusId })
      : undefined,
  );

  const accounts = useAppSelector((state) => {
    const ids = conversation?.get('accounts') as
      | Immutable.List<string>
      | undefined;
    return ids ? ids.map((accountId) => state.accounts.get(accountId)) : [];
  });

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

  const recipient = accounts.find(
    (account) => account && account.get('id') !== me,
  );
  const isMine = status.get('account') === me;

  const handleReply = () => {
    if (!recipient) return;

    dispatch(
      openNewComposer({
        type: 'message',
        toAccountId: recipient.get('id') as string,
      }),
    );
  };

  const names = accounts
    .filter(Boolean)
    .map((account) => account?.get('id') === me ? null : account)
    .filter(Boolean);

  return (
    <Column label={intl.formatMessage(messages.title)}>
      <ColumnHeader
        withBackButton
        title={
          <div className={classes.headerTitle}>
            <ChatCircleDotsIcon size={18} />
            <span>
              {names.length === 1 && names[0] ? (
                <DisplayNameSimple account={names[0]} />
              ) : (
                <FormattedMessage
                  id='messages.conversation.participants'
                  defaultMessage='{count, plural, one {Message} other {Conversation}}'
                  values={{ count: names.length }}
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
                    : accounts.filter((account) => account?.get('id') !== me)
                }
                size={36}
              />
              <div>
                <strong>
                  <DisplayNameSimple account={status.get('account')} />
                </strong>
                <RelativeTimestamp timestamp={status.get('created_at')} />
              </div>
            </div>

            <div className={classes.messageBody}>
              <StatusContent
                // @ts-expect-error legacy StatusContent typing
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
          icon={ReplyIcon}
          onClick={handleReply}
          disabled={!recipient}
        >
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
