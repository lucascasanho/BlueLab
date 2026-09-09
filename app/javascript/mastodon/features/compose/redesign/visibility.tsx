import type React from 'react';
import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

import type { Map as ImmutableMap } from 'immutable';

import {
  ChatCircleIcon,
  MagnifyingGlassIcon,
  NewspaperIcon,
  QuotesIcon,
} from '@phosphor-icons/react';

import { changeComposeThreadItem } from '@/mastodon/actions/compose';
import {
  changeComposeVisibility,
  setComposeQuotePolicy,
} from '@/mastodon/actions/compose_typed';
import { openModal } from '@/mastodon/actions/modal';
import type { ApiQuotePolicy } from '@/mastodon/api_types/quotes';
import type { StatusVisibility } from '@/mastodon/api_types/statuses';
import { CaretIcon } from '@/mastodon/components/button/redesign';
import { DisplayNameSimple } from '@/mastodon/components/display_name/simple';
import {
  Menu,
  MenuList,
  MenuTrigger,
  MenuItemDivider,
  MenuItemGroup,
  MenuItem,
  MenuItemRadio,
  MenuItemCheckbox,
} from '@/mastodon/components/menu';
import { selectPlainAccount } from '@/mastodon/selectors/accounts';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import { selectComposeMentions, selectComposePrivacy } from './selectors';

const useThreadPrivacy = (activeThreadItemId: string | null) => {
  const rootPrivacy = useAppSelector(selectComposePrivacy);
  const threadPrivacy = useAppSelector((state) => {
    if (!activeThreadItemId) return null;
    const item = state.compose
      .get('thread_items')
      .find(
        (candidate: ImmutableMap<string, unknown>) =>
          candidate.get('id') === activeThreadItemId,
      ) as ImmutableMap<string, unknown> | undefined;
    return (item?.get('visibility') as StatusVisibility | undefined) ?? null;
  });

  return threadPrivacy ?? rootPrivacy;
};

export const ComposeVisibility: React.FC<{
  className?: string;
  activeThreadItemId?: string | null;
}> = ({ className, activeThreadItemId = null }) => {
  const privacy = useThreadPrivacy(activeThreadItemId);

  return (
    <div className={className}>
      <FormattedMessage
        id='compose.post.to'
        defaultMessage='To:'
        description='Before button that indicates who a post is for (Public, Followers, mentioned people)'
      />
      <Menu>
        <MenuTrigger size='sm' trailingIcon={CaretIcon}>
          <ComposeVisibilityButtonText
            privacy={privacy}
            activeThreadItemId={activeThreadItemId}
          />
        </MenuTrigger>

        {privacy !== 'direct' ? (
          <ComposeVisibilityMenu activeThreadItemId={activeThreadItemId} />
        ) : (
          <ComposeDirectMenu activeThreadItemId={activeThreadItemId} />
        )}
      </Menu>
    </div>
  );
};

const ComposeVisibilityButtonText: React.FC<{
  privacy: StatusVisibility;
  activeThreadItemId: string | null;
}> = ({ privacy, activeThreadItemId }) => {
  const rootMentions = useAppSelector(selectComposeMentions);
  const mentions = activeThreadItemId ? [] : rootMentions;
  const firstMentionedAccount = useAppSelector((state) =>
    selectPlainAccount(state, mentions.at(0)),
  );

  if (privacy === 'public' || privacy === 'unlisted') {
    return (
      <FormattedMessage id='privacy.public.short' defaultMessage='Public' />
    );
  } else if (privacy === 'private') {
    return (
      <FormattedMessage
        id='compose.post.privacy.followers'
        defaultMessage='Followers {count, plural, =0 {} one {+ # other} other {+ # others}}'
        description='Count is # of other people mentioned in the post. If zero, just output "Followers".'
        values={{ count: mentions.length }}
      />
    );
  } else if (mentions.length > 0) {
    return (
      <FormattedMessage
        id='compose.message.direct.followers'
        defaultMessage='{name} {count, plural, =0 {} one {+ # other} other {+ # others}}'
        description='Name is the primary display name, count is # of other people mentioned in the post'
        values={{
          name: <DisplayNameSimple account={firstMentionedAccount} />,
          count: mentions.length - 1,
        }}
      />
    );
  }

  return '-';
};

const ComposeVisibilityMenu: React.FC<{
  activeThreadItemId: string | null;
}> = ({ activeThreadItemId }) => {
  const privacy = useThreadPrivacy(activeThreadItemId);
  const defaultPrivacy = useAppSelector(
    (state) => state.compose.get('default_privacy') as StatusVisibility,
  );
  const currentQuotePolicy = useAppSelector(
    (state) => state.compose.get('quote_policy') as ApiQuotePolicy | undefined,
  );
  const defaultQuotePolicy = useAppSelector(
    (state) => state.compose.get('default_quote_policy') as ApiQuotePolicy,
  );
  const quotePolicy = currentQuotePolicy ?? defaultQuotePolicy;

  const dispatch = useAppDispatch();
  const applyPrivacy = useCallback(
    (value: StatusVisibility) => {
      if (activeThreadItemId) {
        dispatch(
          changeComposeThreadItem(activeThreadItemId, 'visibility', value),
        );
      } else {
        dispatch(changeComposeVisibility(value));
      }
    },
    [activeThreadItemId, dispatch],
  );
  const handlePrivacyChange = useCallback(
    ({ value }: { value: string }) => {
      if (value === 'private' && privacy !== 'private') {
        applyPrivacy('private');
      } else if (value === 'public' && privacy === 'private') {
        applyPrivacy(defaultPrivacy === 'unlisted' ? 'unlisted' : 'public');
      } else if (value === 'unlisted' && privacy !== 'private') {
        applyPrivacy(privacy === 'public' ? 'unlisted' : 'public');
      }
    },
    [applyPrivacy, defaultPrivacy, privacy],
  );
  const handleQuotePolicyChange = useCallback(
    ({ value, checked }: { value: string; checked?: boolean }) => {
      if (activeThreadItemId) return;

      let newQuotePolicy: ApiQuotePolicy = 'nobody';
      switch (value) {
        case 'public':
          newQuotePolicy = 'public';
          break;
        case 'followers':
          newQuotePolicy = 'followers';
          break;
        case 'others':
          if (checked) {
            newQuotePolicy =
              defaultQuotePolicy !== 'nobody' ? defaultQuotePolicy : 'public';
          }
          break;
      }
      dispatch(setComposeQuotePolicy(newQuotePolicy));
    },
    [activeThreadItemId, defaultQuotePolicy, dispatch],
  );

  const handleSwitchToMessage: React.MouseEventHandler<HTMLButtonElement> =
    useCallback(() => {
      applyPrivacy('direct');
    }, [applyPrivacy]);

  return (
    <MenuList placement='bottom-start' offset={4} maxWidth={280}>
      <MenuItemGroup
        label={
          <FormattedMessage
            id='compose.visibility.title'
            defaultMessage='Visibility'
          />
        }
      >
        <MenuItemRadio
          name='visibility'
          value='public'
          checked={privacy === 'public' || privacy === 'unlisted'}
          onChange={handlePrivacyChange}
          keepMenuOpenOnClick
        >
          <FormattedMessage id='privacy.public.short' defaultMessage='Public' />
        </MenuItemRadio>

        <MenuItemRadio
          name='visibility'
          value='private'
          checked={privacy === 'private'}
          onChange={handlePrivacyChange}
          keepMenuOpenOnClick
        >
          <FormattedMessage
            id='privacy.private.short'
            defaultMessage='Followers'
          />
        </MenuItemRadio>

        <MenuItemDivider />

        <MenuItemCheckbox
          value='unlisted'
          disabled={privacy === 'private'}
          checked={privacy === 'public'}
          onChange={handlePrivacyChange}
          icon={MagnifyingGlassIcon}
          keepMenuOpenOnClick
        >
          <FormattedMessage
            id='compose.discoverable'
            defaultMessage='Discoverable in public feeds & search results'
          />
        </MenuItemCheckbox>

        {!activeThreadItemId && (
          <MenuItemCheckbox
            value='others'
            disabled={privacy === 'private'}
            checked={quotePolicy !== 'nobody' && privacy !== 'private'}
            onChange={handleQuotePolicyChange}
            icon={QuotesIcon}
            keepMenuOpenOnClick
          >
            <FormattedMessage
              id='compose.quotable'
              defaultMessage='Allow others to quote'
            />
          </MenuItemCheckbox>
        )}
      </MenuItemGroup>

      {!activeThreadItemId &&
        quotePolicy !== 'nobody' &&
        privacy !== 'private' && (
          <MenuItemGroup
            label={
              <FormattedMessage
                id='compose.visibility.quote_policy'
                defaultMessage='Who can quote'
              />
            }
          >
            <MenuItemRadio
              name='quote_policy'
              value='public'
              checked={quotePolicy === 'public'}
              onChange={handleQuotePolicyChange}
              keepMenuOpenOnClick
            >
              <FormattedMessage
                id='compose.visibility.quote_policy.anyone'
                defaultMessage='Anyone'
              />
            </MenuItemRadio>

            <MenuItemRadio
              name='quote_policy'
              value='followers'
              checked={quotePolicy === 'followers'}
              onChange={handleQuotePolicyChange}
              keepMenuOpenOnClick
            >
              <FormattedMessage
                id='compose.visibility.quote_policy.followers'
                defaultMessage='Followers'
              />
            </MenuItemRadio>
          </MenuItemGroup>
        )}

      <MenuItemDivider />

      <MenuItem icon={ChatCircleIcon} onClick={handleSwitchToMessage}>
        <FormattedMessage
          id='compose.post.to_message'
          defaultMessage='Compose a message instead'
          description='Message refers to a direct message. For languages where this is confusing, "chat" or "direct message" can be used.'
        />
      </MenuItem>
    </MenuList>
  );
};

const ComposeDirectMenu: React.FC<{
  activeThreadItemId: string | null;
}> = ({ activeThreadItemId }) => {
  const dispatch = useAppDispatch();
  const defaultPrivacy = useAppSelector(
    (state) => state.compose.get('default_privacy') as StatusVisibility,
  );
  const handleSwitchToPost: React.MouseEventHandler<HTMLButtonElement> =
    useCallback(() => {
      if (activeThreadItemId) {
        dispatch(
          changeComposeThreadItem(
            activeThreadItemId,
            'visibility',
            defaultPrivacy === 'direct' ? 'public' : defaultPrivacy,
          ),
        );
      } else {
        dispatch(
          openModal({ modalType: 'COMPOSER_SWITCH_TO_POST', modalProps: {} }),
        );
      }
    }, [activeThreadItemId, defaultPrivacy, dispatch]);

  return (
    <MenuList placement='bottom-start' offset={4} maxWidth={280}>
      <MenuItemGroup
        label={
          <FormattedMessage
            id='compose.visibility.title'
            defaultMessage='Visibility'
          />
        }
      >
        <MenuItemRadio value='direct' disabled checked>
          <FormattedMessage
            id='compose.visibility.direct_note'
            defaultMessage='Everyone mentioned'
          />
        </MenuItemRadio>
      </MenuItemGroup>

      <MenuItemDivider />

      <MenuItem icon={NewspaperIcon} onClick={handleSwitchToPost}>
        <FormattedMessage
          id='compose.visibility.to_post'
          defaultMessage='Compose a post instead'
        />
      </MenuItem>
    </MenuList>
  );
};
