import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';

import { EyeSlashIcon, GearIcon, WarningIcon } from '@phosphor-icons/react';

import {
  changeComposeSensitivity,
  changeComposeSpoilerness,
  changeComposeThreadItem,
} from '@/mastodon/actions/compose';
import { setComposeQuotePolicy } from '@/mastodon/actions/compose_typed';
import type { ApiQuotePolicy } from '@/mastodon/api_types/quotes';
import { IconButton } from '@/mastodon/components/button/vanilla_redesign';
import {
  Menu,
  MenuItemCheckbox,
  MenuItemDivider,
  MenuItemGroup,
  MenuItemRadio,
  MenuList,
  MenuTrigger,
} from '@/mastodon/components/menu';
import { useBreakpoint } from '@/mastodon/features/ui/hooks/useBreakpoint';
import {
  useAppDispatch,
  useAppSelector,
} from '@/mastodon/store/typed_functions';

import {
  selectComposePrivacy,
  selectComposeQuotePolicy,
  selectComposeSensitive,
} from './selectors';

export const ComposeSettingsMenu: React.FC<{
  activeThreadItemId?: string | null;
}> = ({ activeThreadItemId = null }) => {
  const isMobile = useBreakpoint('openable');

  return (
    <Menu noFocus={isMobile}>
      <MenuTrigger as={IconButton} icon={GearIcon} size='sm'>
        <FormattedMessage id='compose.settings' defaultMessage='Settings' />
      </MenuTrigger>

      <MenuList
        portal
        mobilePresentation='popover'
        constrainToViewport
        scrollable
        maxWidth={280}
        placement='top-end'
        strategy='fixed'
      >
        <ComposeSettingsInnerMenu activeThreadItemId={activeThreadItemId} />
      </MenuList>
    </Menu>
  );
};

const ComposeSettingsInnerMenu: React.FC<{
  activeThreadItemId: string | null;
}> = ({ activeThreadItemId }) => {
  // Quote policy
  const quotePolicy = useAppSelector(selectComposeQuotePolicy);
  const privacy = useAppSelector(selectComposePrivacy);
  const disablePublicQuotes = privacy === 'private';

  const dispatch = useAppDispatch();
  const onQuotePolicyChange = useCallback(
    ({ value }: { value: string }) => {
      let newQuotePolicy: ApiQuotePolicy = 'nobody';
      switch (value) {
        case 'public':
          newQuotePolicy = 'public';
          break;
        case 'followers':
          newQuotePolicy = 'followers';
          break;
      }
      dispatch(setComposeQuotePolicy(newQuotePolicy));
    },
    [dispatch],
  );

  // Sensitive content
  const rootSensitive = useAppSelector(selectComposeSensitive);
  const threadSensitive = useAppSelector((state) => {
    if (!activeThreadItemId) return null;
    const items = state.compose.get('thread_items') as ImmutableList<
      ImmutableMap<string, unknown>
    >;
    const item = items.find(
      (candidate) => candidate.get('id') === activeThreadItemId,
    );
    return item ? !!item.get('sensitive') : null;
  });
  const sensitive = threadSensitive ?? rootSensitive.sensitive;
  const mediaSensitive = rootSensitive.mediaSensitive;

  const onSensitiveChange = useCallback(() => {
    if (activeThreadItemId) {
      const nextSensitive = !sensitive;
      dispatch(
        changeComposeThreadItem(activeThreadItemId, 'sensitive', nextSensitive),
      );
      if (!nextSensitive) {
        dispatch(changeComposeThreadItem(activeThreadItemId, 'spoiler_text', ''));
      }
    } else {
      dispatch(changeComposeSpoilerness());
    }
  }, [activeThreadItemId, dispatch, sensitive]);
  const onMediaSensitiveChange = useCallback(() => {
    dispatch(changeComposeSensitivity());
  }, [dispatch]);

  return (
    <>
      {!activeThreadItemId && privacy !== 'direct' && (
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
            onChange={onQuotePolicyChange}
            disabled={disablePublicQuotes}
            keepMenuOpenOnClick
          >
            <FormattedMessage
              id='visibility_modal.quote_public'
              defaultMessage='Anyone'
            />
          </MenuItemRadio>

          <MenuItemRadio
            name='quote_policy'
            value='followers'
            checked={quotePolicy === 'followers'}
            onChange={onQuotePolicyChange}
            disabled={disablePublicQuotes}
            keepMenuOpenOnClick
          >
            <FormattedMessage
              id='compose.visibility.quote_policy.followers'
              defaultMessage='Followers'
            />
          </MenuItemRadio>

          <MenuItemRadio
            name='quote_policy'
            value='nobody'
            checked={quotePolicy === 'nobody'}
            onChange={onQuotePolicyChange}
            description={
              disablePublicQuotes && (
                <FormattedMessage
                  id='compose.visibility.quote_policy.only_me_hint'
                  defaultMessage="When your post's visibility is set to Followers, it can only be quoted by you."
                />
              )
            }
            keepMenuOpenOnClick
          >
            <FormattedMessage
              id='visibility_modal.quote_nobody'
              defaultMessage='Just me'
            />
          </MenuItemRadio>
        </MenuItemGroup>
      )}

      {!activeThreadItemId && privacy !== 'direct' && <MenuItemDivider />}

      <MenuItemGroup
        label={
          <FormattedMessage
            id='compose.sensitive.label'
            defaultMessage='Sensitive content'
          />
        }
      >
        <MenuItemCheckbox
          name='content_warning'
          value='on'
          checked={sensitive}
          onChange={onSensitiveChange}
          keepMenuOpenOnClick
          icon={WarningIcon}
        >
          <FormattedMessage
            id='compose_form.spoiler.unmarked'
            defaultMessage='Add content warning'
          />
        </MenuItemCheckbox>
        {!activeThreadItemId && (
          <MenuItemCheckbox
            name='media_spoiler'
            value='on'
            checked={mediaSensitive}
            disabled={sensitive}
            onChange={onMediaSensitiveChange}
            keepMenuOpenOnClick
            icon={EyeSlashIcon}
          >
            <FormattedMessage
              id='compose.blur_media'
              defaultMessage='Blur media'
            />
          </MenuItemCheckbox>
        )}
      </MenuItemGroup>
    </>
  );
};
