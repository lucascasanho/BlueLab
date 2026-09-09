import type React from 'react';
import { useCallback } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import type { Map as ImmutableMap } from 'immutable';

import { MagnifyingGlassIcon } from '@phosphor-icons/react';

import {
  changeComposeLanguage,
  changeComposeThreadItem,
} from '@/mastodon/actions/compose';
import { CaretIcon } from '@/mastodon/components/button/redesign';
import { TextInput } from '@/mastodon/components/form_fields/redesign';
import {
  Menu,
  MenuItem,
  MenuList,
  MenuTrigger,
} from '@/mastodon/components/menu';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import { useLanguageList } from './hooks';
import classes from './styles.module.scss';

const messages = defineMessages({
  searchPlaceholder: {
    id: 'compose.language.search',
    defaultMessage: 'Search languages...',
  },
});

export const LanguageButton: React.FC<{
  activeThreadItemId?: string | null;
}> = ({ activeThreadItemId = null }) => {
  const rootLangCode = useAppSelector(
    (state) => state.compose.get('language') as string,
  );
  const threadLangCode = useAppSelector((state) => {
    if (!activeThreadItemId) return null;
    const item = state.compose
      .get('thread_items')
      .find(
        (candidate: ImmutableMap<string, unknown>) =>
          candidate.get('id') === activeThreadItemId,
      ) as ImmutableMap<string, unknown> | undefined;
    return (item?.get('language') as string | undefined) ?? null;
  });
  const langCode = threadLangCode ?? rootLangCode;

  return (
    <Menu>
      <MenuTrigger size='sm' trailingIcon={CaretIcon}>
        {langCode.toLocaleUpperCase()}
      </MenuTrigger>

      <MenuList
        placement='bottom-end'
        className={classes.languageMenu}
        maxWidth={280}
      >
        <LanguageDropdown activeThreadItemId={activeThreadItemId} />
      </MenuList>
    </Menu>
  );
};

export const LanguageDropdown: React.FC<{
  activeThreadItemId?: string | null;
}> = ({ activeThreadItemId = null }) => {
  const { languages, onSearch } = useLanguageList();

  const dispatch = useAppDispatch();
  const handleChange: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      const newLanguage = event.currentTarget.dataset.language;
      if (newLanguage) {
        if (activeThreadItemId) {
          dispatch(
            changeComposeThreadItem(
              activeThreadItemId,
              'language',
              newLanguage,
            ),
          );
        } else {
          dispatch(changeComposeLanguage(newLanguage));
        }
      }
    },
    [activeThreadItemId, dispatch],
  );

  const intl = useIntl();
  const handleSearch: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      onSearch(event.target.value);
    },
    [onSearch],
  );

  return (
    <>
      <TextInput
        type='search'
        onChange={handleSearch}
        placeholder={intl.formatMessage(messages.searchPlaceholder)}
        icon={MagnifyingGlassIcon}
      />
      <div className={classes.languageList}>
        {languages.map((lang) => (
          <MenuItem
            key={lang[0]}
            onClick={handleChange}
            data-language={lang[0]}
            className={classes.languageItem}
          >
            <strong>{lang[2]}</strong>&nbsp;<span>({lang[1]})</span>
          </MenuItem>
        ))}

        {languages.length === 0 && (
          <FormattedMessage
            id='compose.language.not-found'
            defaultMessage='No language found'
          />
        )}
      </div>
    </>
  );
};
