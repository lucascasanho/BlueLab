import { useCallback, useState } from 'react';

import { FormattedMessage } from 'react-intl';

import classNames from 'classnames';

import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';

import {
  ChatCircleDotsIcon,
  EyeIcon,
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
import { Button, CaretIcon } from '@/mastodon/components/button/redesign';
import { Icon } from '@/mastodon/components/icon';
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
import { Tooltip } from '@/mastodon/components/tooltip';
import { selectPlainAccount } from '@/mastodon/selectors/accounts';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import { selectComposeMentions, selectComposePrivacy } from './selectors';
import classes from './styles.module.scss';

const isBlue2ThemeActive = () =>
  typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';

const useThreadPrivacy = (activeThreadItemId: string | null) => {
  const rootPrivacy = useAppSelector(selectComposePrivacy);
  const threadPrivacy = useAppSelector((state) => {
    if (!activeThreadItemId) return null;
    const items = state.compose.get('thread_items') as ImmutableList<
      ImmutableMap<string, unknown>
    >;
    const item = items.find(
      (candidate) => candidate.get('id') === activeThreadItemId,
    );
    return (item?.get('visibility') as StatusVisibility | undefined) ?? null;
  });

  return threadPrivacy ?? rootPrivacy;
};

export const ComposeVisibility: React.FC<{
  className?: string;
  activeThreadItemId?: string | null;
}> = ({ className, activeThreadItemId = null }) => {
  const privacy = useThreadPrivacy(activeThreadItemId);
  const isEditing = useAppSelector((state) => !!state.compose.get('id'));

  if (privacy === 'direct') return null;

  if (isEditing) {
    return (
      <div className={className}>
        <Tooltip
          renderTextWhenClosed
          text={
            <FormattedMessage
              id='compose.privacy.editing'
              defaultMessage='Visibility can’t be edited after a post has been published.'
            />
          }
        >
          {({ getTooltipProps, tooltipId }) => (
            <Button
              {...getTooltipProps()}
              size='sm'
              aria-disabled
              aria-describedby={tooltipId}
            >
              <ComposeVisibilityButtonText privacy={privacy} />
            </Button>
          )}
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={className}>
      <Menu>
        <MenuTrigger
          as={Button}
          size='sm'
          trailingIcon={CaretIcon}
          disabled={isEditing}
        >
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
  } else if (privacy === 'unlisted') {
    return (
      <FormattedMessage
        id='compose.privacy.unlisted'
        defaultMessage='Public, hidden from search'
      />
    );
  } else if (privacy === 'private') {
    return (
      <FormattedMessage
        id='compose.privacy.followers'
        defaultMessage='Followers (+ mentions)'
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
  const useBlue2Popover = isBlue2ThemeActive();

  // Track the last public quote policy, so the picker remembers what was last used before quoting was disabled.
  const [lastQuotePolicy, setLastQuotePolicy] = useState(
    defaultQuotePolicy !== 'nobody' ? defaultQuotePolicy : 'public',
  );
  const quotePolicy = currentQuotePolicy ?? defaultQuotePolicy;

  const isReply = useAppSelector((state) => !!state.compose.get('in_reply_to'));

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
          setLastQuotePolicy(newQuotePolicy);
          break;
        case 'followers':
          newQuotePolicy = 'followers';
          setLastQuotePolicy(newQuotePolicy);
          break;
        case 'others':
          if (checked) {
            newQuotePolicy = lastQuotePolicy;
          }
          break;
      }
      dispatch(setComposeQuotePolicy(newQuotePolicy));
    },
    [activeThreadItemId, dispatch, lastQuotePolicy],
  );

  const handleSwitchToMessage: React.MouseEventHandler<HTMLButtonElement> =
    useCallback(() => {
      applyPrivacy('direct');
    }, [applyPrivacy]);

  return (
    <MenuList
      placement='bottom-start'
      offset={4}
      maxWidth={280}
      portal={useBlue2Popover}
      mobilePresentation={useBlue2Popover ? 'popover' : undefined}
      strategy={useBlue2Popover ? 'fixed' : undefined}
    >
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
            id='compose.privacy.followers'
            defaultMessage='Followers (+ mentions)'
          />
        </MenuItemRadio>

        <MenuItemDivider />

        <MenuItemCheckbox
          value='unlisted'
          disabled={privacy === 'private'}
          checked={privacy === 'unlisted' || privacy === 'private'}
          onChange={handlePrivacyChange}
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

      <MenuItem icon={ChatCircleDotsIcon} onClick={handleSwitchToMessage}>
        {isReply ? (
          <FormattedMessage
            id='compose.post.to_private_reply'
            defaultMessage='Reply privately instead'
          />
        ) : (
          <FormattedMessage
            id='compose.post.to_message'
            defaultMessage='Convert to private message'
            description='Message refers to a direct message. For languages where this is confusing, "chat" or "direct message" can be used.'
          />
        )}
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
  const useBlue2Popover = isBlue2ThemeActive();
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

  const isReply = useAppSelector((state) => !!state.compose.get('in_reply_to'));

  return (
    <MenuList
      placement='bottom-start'
      offset={4}
      maxWidth={280}
      portal={useBlue2Popover}
      mobilePresentation={useBlue2Popover ? 'popover' : undefined}
      strategy={useBlue2Popover ? 'fixed' : undefined}
    >
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
        {isReply ? (
          <FormattedMessage
            id='compose.visibility.to_reply'
            defaultMessage='Reply publicly instead'
          />
        ) : (
          <FormattedMessage
            id='compose.visibility.to_post'
            defaultMessage='Compose a post instead'
          />
        )}
      </MenuItem>
    </MenuList>
  );
};
