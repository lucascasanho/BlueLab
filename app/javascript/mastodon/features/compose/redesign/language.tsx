import type React from 'react';
import { useCallback, useId, useMemo, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';

import { MagnifyingGlassIcon, TranslateIcon } from '@phosphor-icons/react';

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
    const items = state.compose.get('thread_items') as ImmutableList<
      ImmutableMap<string, unknown>
    >;
    const item = items.find(
      (candidate) => candidate.get('id') === activeThreadItemId,
    );
    return (item?.get('language') as string | undefined) ?? null;
  });
  const langCode = threadLangCode ?? rootLangCode;
  const isBlue2 =
    typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';

  const [isOpen, { onToggle: toggle, onFalse: close }] = useToggle(false);
  const [triggerElement, setTriggerElement] =
    useState<HTMLButtonElement | null>(null);

  return (
    <>
      <Button
        ref={setTriggerElement}
        size='sm'
        leadingIcon={TranslateIcon}
        aria-expanded={isOpen}
        tooltip={{
          type: 'description',
          text: (
            <FormattedMessage
              id='compose.language.change'
              defaultMessage='Change language'
            />
          ),
        }}
        onClick={toggle}
      >
        {langCode.toLocaleUpperCase()}
        <span className='sr-only'>({getLanguageNameFromCode(langCode)})</span>
      </Button>

      <PopoverMenuCard
        isOpen={isOpen}
        placement='bottom-end'
        strategy='fixed'
        reference={triggerElement}
        container={null}
        className={classes.languageMenu}
        maxWidth={280}
        portal={isBlue2}
        mobilePresentation={isBlue2 ? 'popover' : 'bottom-sheet'}
        strategy={isBlue2 ? 'fixed' : undefined}
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
      setInputValue(event.target.value);
      onSearch(event.target.value);
    },
    [onSearch],
  );
  const handleSelectLanguage = useCallback(
    ({ code }: LanguageObject) => {
      if (code) {
        dispatch(changeComposeLanguage(code));
        onClose();
      }
    },
    [dispatch, onClose],
  );

  const uniqueId = useId();
  const languageObjects = useMemo(
    () =>
      languages.map(([code, name, localName]) => ({
        id: `${uniqueId}-${code}`,
        code,
        name,
        localName,
      })),
    [languages, uniqueId],
  );

  return (
    <Combobox
      autoFocus
      listBoxType='in-place'
      value={inputValue}
      onChange={handleSearch}
      placeholder={intl.formatMessage(messages.searchPlaceholder)}
      icon={MagnifyingGlassIcon}
      items={languageObjects}
      renderItem={renderLanguageItem}
      onSelectItem={handleSelectLanguage}
      wrapperClassName={classes.languageComboboxWrapper}
      listBoxClassName={classes.languageListBox}
    />
  );
};

function renderLanguageItem({ code, name, localName }: LanguageObject) {
  return (
    <ComboboxMenuItem>
      <span>
        <strong lang={code}>{localName}</strong> ({name})
      </span>
    </ComboboxMenuItem>
  );
}
