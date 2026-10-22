import {
  useCallback,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useId,
} from 'react';

import {
  defineMessages,
  useIntl,
  FormattedMessage,
  FormattedList,
} from 'react-intl';

import classNames from 'classnames';
import { useHistory } from 'react-router-dom';

import { isFulfilled } from '@reduxjs/toolkit';

import { MagnifyingGlassIcon, XCircleIcon, XIcon } from '@phosphor-icons/react';

import {
  FOCUS_TARGET,
  useFocusAfterNavigation,
} from '@/mastodon/components/navigation_focus_target';
import { getCollectionPath } from '@/mastodon/features/collections/utils';
import {
  clickSearchResult,
  forgetSearchResult,
  openURL,
} from 'mastodon/actions/search';
import { Icon, iconWeight } from 'mastodon/components/icon';
import { useIdentity } from 'mastodon/identity_context';
import { domain, searchEnabled } from 'mastodon/initial_state';
import type { RecentSearch, SearchType } from 'mastodon/models/search';
import { useAppSelector, useAppDispatch } from 'mastodon/store';
import { HASHTAG_REGEX } from 'mastodon/utils/hashtags';

import classes from './search.module.scss';

const messages = defineMessages({
  placeholder: { id: 'search.placeholder', defaultMessage: 'Search' },
  placeholderSidebar: {
    id: 'search.placeholder_ellipsis',
    defaultMessage: 'Search…',
  },
  clearSearch: { id: 'search.clear', defaultMessage: 'Clear search' },
  placeholderSignedIn: {
    id: 'search.search_or_paste',
    defaultMessage: 'Search or paste URL',
  },
});

const labelForRecentSearch = (search: RecentSearch) => {
  switch (search.type) {
    case 'account':
      return `@${search.q}`;
    case 'hashtag':
      return `#${search.q}`;
    default:
      return search.q;
  }
};

const ClearButton: React.FC<{
  onClick: () => void;
  hasValue: boolean;
}> = ({ onClick, hasValue }) => {
  const intl = useIntl();

  return (
    <div
      className={classNames('search__icon-wrapper', classes.searchIcon, {
        'has-value': hasValue,
      })}
    >
      <Icon id='search' icon={MagnifyingGlassIcon} className='search__icon' />
      <button
        type='button'
        onClick={onClick}
        className='search__icon search__icon--clear-button'
        tabIndex={hasValue ? undefined : -1}
        aria-hidden={!hasValue}
      >
        <Icon
          id='times-circle'
          icon={iconWeight(XCircleIcon, 'fill')}
          aria-label={intl.formatMessage(messages.clearSearch)}
        />
      </button>
    </div>
  );
};

interface SearchScrollPosition {
  element: HTMLElement;
  top: number;
  left: number;
}

interface SearchScrollSnapshot {
  input: HTMLInputElement;
  positions: SearchScrollPosition[];
}

const getSearchScrollPositions = (
  input: HTMLInputElement,
): SearchScrollPosition[] => {
  const positions: SearchScrollPosition[] = [];
  const seen = new Set<HTMLElement>();
  const documentScroller = document.scrollingElement;

  const addPosition = (element: HTMLElement) => {
    if (seen.has(element)) return;

    if (
      element !== documentScroller &&
      element.scrollHeight <= element.clientHeight &&
      element.scrollWidth <= element.clientWidth
    ) {
      return;
    }

    positions.push({
      element,
      top: element.scrollTop,
      left: element.scrollLeft,
    });
    seen.add(element);
  };

  let element = input.parentElement;
  while (element) {
    addPosition(element);
    element = element.parentElement;
  }

  // The timeline can scroll independently from the search header. Also track
  // the shared document and layout scrollers, including when the search field
  // lives in the navigation panel instead of inside a column.
  document
    .querySelectorAll<HTMLElement>(
      '.scrollable, .column, .columns-area, .columns-area--mobile, .columns-area__panels, .columns-area__panels__main, .main, [data-column-root]',
    )
    .forEach(addPosition);

  if (documentScroller instanceof HTMLElement) {
    addPosition(documentScroller);
  }

  return positions;
};

const restoreSearchScrollPositions = (positions: SearchScrollPosition[]) => {
  positions.forEach(({ element, top, left }) => {
    if (!element.isConnected) return;

    if (element.scrollTop !== top) {
      element.scrollTop = top;
    }

    if (element.scrollLeft !== left) {
      element.scrollLeft = left;
    }
  });
};

interface SearchOption {
  key: string;
  label: React.ReactNode;
  action: (e: React.MouseEvent | React.KeyboardEvent) => void;
  forget?: (e: React.MouseEvent | React.KeyboardEvent) => void;
}

export const Search: React.FC<{
  singleColumn: boolean;
  context?: 'column' | 'sidebar';
  initialValue?: string;
}> = ({ singleColumn, context = 'column', initialValue }) => {
  const intl = useIntl();
  const recent = useAppSelector((state) => state.search.recent);
  const { signedIn } = useIdentity();
  const dispatch = useAppDispatch();
  const history = useHistory();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue ?? '');
  const hasValue = value.length > 0;
  const [expanded, setExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState(-1);
  const [quickActions, setQuickActions] = useState<SearchOption[]>([]);
  const [shouldOpenOnFocus, setShouldOpenOnFocus] = useState(
    context === 'sidebar',
  );
  const handleAfterNavigationFocus = useCallback(() => {
    setShouldOpenOnFocus(true);
  }, []);
  const focusAfterNavigation = useFocusAfterNavigation(
    FOCUS_TARGET.SEARCH,
    handleAfterNavigationFocus,
  );
  const setSearchInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      searchInputRef.current = element;
      focusAfterNavigation(element);
    },
    [focusAfterNavigation],
  );

  const unfocus = useCallback(() => {
    document.querySelector('.ui')?.parentElement?.focus();
    setExpanded(false);
  }, []);

  const insertText = useCallback((text: string) => {
    setValue((currentValue) => {
      if (currentValue === '') {
        return text;
      } else if (currentValue.endsWith(' ')) {
        return `${currentValue}${text}`;
      } else {
        return `${currentValue} ${text}`;
      }
    });
  }, []);

  const searchOptions = useMemo(() => {
    if (!searchEnabled) {
      return [];
    } else {
      const options: SearchOption[] = [
        {
          key: 'prompt-has',
          label: (
            <>
              <mark>has:</mark>{' '}
              <FormattedList
                type='disjunction'
                value={['media', 'poll', 'embed']}
              />
            </>
          ),
          action: (e) => {
            e.preventDefault();
            insertText('has:');
          },
        },
        {
          key: 'prompt-is',
          label: (
            <>
              <mark>is:</mark>{' '}
              <FormattedList
                type='disjunction'
                value={['reply', 'sensitive']}
              />
            </>
          ),
          action: (e) => {
            e.preventDefault();
            insertText('is:');
          },
        },
        {
          key: 'prompt-language',
          label: (
            <>
              <mark>language:</mark>{' '}
              <FormattedMessage
                id='search_popout.language_code'
                defaultMessage='ISO language code'
              />
            </>
          ),
          action: (e) => {
            e.preventDefault();
            insertText('language:');
          },
        },
        {
          key: 'prompt-from',
          label: (
            <>
              <mark>from:</mark>{' '}
              <FormattedMessage id='search_popout.user' defaultMessage='user' />
            </>
          ),
          action: (e) => {
            e.preventDefault();
            insertText('from:');
          },
        },
        {
          key: 'prompt-before',
          label: (
            <>
              <mark>before:</mark>{' '}
              <FormattedMessage
                id='search_popout.specific_date'
                defaultMessage='specific date'
              />
            </>
          ),
          action: (e) => {
            e.preventDefault();
            insertText('before:');
          },
        },
        {
          key: 'prompt-during',
          label: (
            <>
              <mark>during:</mark>{' '}
              <FormattedMessage
                id='search_popout.specific_date'
                defaultMessage='specific date'
              />
            </>
          ),
          action: (e) => {
            e.preventDefault();
            insertText('during:');
          },
        },
        {
          key: 'prompt-after',
          label: (
            <>
              <mark>after:</mark>{' '}
              <FormattedMessage
                id='search_popout.specific_date'
                defaultMessage='specific date'
              />
            </>
          ),
          action: (e) => {
            e.preventDefault();
            insertText('after:');
          },
        },
        {
          key: 'prompt-in',
          label: (
            <>
              <mark>in:</mark>{' '}
              <FormattedList
                type='disjunction'
                value={['all', 'library', 'public']}
              />
            </>
          ),
          action: (e) => {
            e.preventDefault();
            insertText('in:');
          },
        },
      ];
      return options;
    }
  }, [insertText]);

  const recentOptions: SearchOption[] = useMemo(
    () =>
      recent.map((search) => ({
        key: `${search.type}/${search.q}`,
        label: labelForRecentSearch(search),
        action: () => {
          setValue(search.q);

          if (search.type === 'account') {
            history.push(`/@${search.q}`);
          } else if (search.type === 'hashtag') {
            history.push(`/tags/${search.q}`);
          } else {
            const queryParams = new URLSearchParams({ q: search.q });
            if (search.type) queryParams.set('type', search.type);
            history.push({
              pathname: '/search',
              search: queryParams.toString(),
            });
          }

          unfocus();
        },
        forget: (e) => {
          e.stopPropagation();
          void dispatch(forgetSearchResult(search));
        },
      })),
    [dispatch, history, recent, unfocus],
  );

  const navigableOptions: SearchOption[] = useMemo(
    () =>
      hasValue
        ? quickActions.concat(searchOptions)
        : recentOptions.concat(quickActions, searchOptions),
    [hasValue, quickActions, recentOptions, searchOptions],
  );

  const submit = useCallback(
    (q: string, type?: SearchType) => {
      void dispatch(clickSearchResult({ q, type }));
      const queryParams = new URLSearchParams({ q });
      if (type) queryParams.set('type', type);
      history.push({ pathname: '/search', search: queryParams.toString() });
      unfocus();
    },
    [dispatch, history, unfocus],
  );

  const searchScrollSnapshotRef = useRef<SearchScrollSnapshot | null>(null);
  const [focusedSearchInput, setFocusedSearchInput] =
    useState<HTMLInputElement | null>(null);

  const captureSearchScroll = useCallback(
    (input: HTMLInputElement, replace = false) => {
      const current = searchScrollSnapshotRef.current;
      if (current?.input === input && !replace) return;

      searchScrollSnapshotRef.current = {
        input,
        positions: getSearchScrollPositions(input),
      };
    },
    [],
  );

  const handleBeforeInput = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      captureSearchScroll(event.currentTarget);
    },
    [captureSearchScroll],
  );

  useEffect(() => {
    if (!focusedSearchInput) return;

    let frame = 0;
    let releaseIntentTimer: number | undefined;
    let intentionalScroll = false;

    const rebaseAfterIntentionalScroll = (event: Event) => {
      intentionalScroll = true;

      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;

        if (document.activeElement === focusedSearchInput) {
          captureSearchScroll(focusedSearchInput, true);
        }

        if (releaseIntentTimer !== undefined) {
          window.clearTimeout(releaseIntentTimer);
        }

        // Wheel gestures usually finish quickly. Touch scrolling can continue
        // with momentum, so keep its allowance active a little longer.
        const delay = event.type === 'touchmove' ? 700 : 120;
        releaseIntentTimer = window.setTimeout(() => {
          intentionalScroll = false;
          releaseIntentTimer = undefined;
        }, delay);
      });
    };

    const restoreUnexpectedScroll = () => {
      if (intentionalScroll || document.activeElement !== focusedSearchInput) {
        return;
      }

      const snapshot = searchScrollSnapshotRef.current;
      if (snapshot?.input === focusedSearchInput) {
        restoreSearchScrollPositions(snapshot.positions);
      }
    };

    // Backspace can trigger browser scroll anchoring as the suggestion panel
    // changes height. Keep that automatic movement from accumulating while
    // leaving wheel and touch scrolling available to the user.
    document.addEventListener('scroll', restoreUnexpectedScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener('scroll', restoreUnexpectedScroll, {
      passive: true,
    });
    document.addEventListener('wheel', rebaseAfterIntentionalScroll, {
      capture: true,
      passive: true,
    });
    document.addEventListener('touchmove', rebaseAfterIntentionalScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      if (releaseIntentTimer !== undefined) {
        window.clearTimeout(releaseIntentTimer);
      }
      document.removeEventListener('scroll', restoreUnexpectedScroll, true);
      window.removeEventListener('scroll', restoreUnexpectedScroll);
      document.removeEventListener('wheel', rebaseAfterIntentionalScroll, true);
      document.removeEventListener(
        'touchmove',
        rebaseAfterIntentionalScroll,
        true,
      );
    };
  }, [captureSearchScroll, focusedSearchInput]);

  const handleChange = useCallback(
    ({
      target: { value },
      currentTarget,
    }: React.ChangeEvent<HTMLInputElement>) => {
      captureSearchScroll(currentTarget);
      setValue(value);
      setExpanded(true);
      setSelectedOption(-1);

      const trimmedValue = value.trim();
      const newQuickActions = [];

      if (trimmedValue.length > 0) {
        const couldBeURL =
          trimmedValue.startsWith('https://') && !trimmedValue.includes(' ');

        if (couldBeURL) {
          newQuickActions.push({
            key: 'open-url',
            label: (
              <FormattedMessage
                id='search.quick_action.open_url'
                defaultMessage='Open URL in Mastodon'
              />
            ),
            action: async () => {
              const result = await dispatch(openURL({ url: trimmedValue }));

              if (isFulfilled(result)) {
                if (result.payload.accounts[0]) {
                  history.push(`/@${result.payload.accounts[0].acct}`);
                } else if (result.payload.statuses[0]) {
                  history.push(
                    `/@${result.payload.statuses[0].account.acct}/${result.payload.statuses[0].id}`,
                  );
                } else if (result.payload.collections[0]) {
                  history.push(
                    getCollectionPath(result.payload.collections[0].id),
                  );
                }
              }

              unfocus();
            },
          });
        }

        const couldBeHashtag =
          (trimmedValue.startsWith('#') && trimmedValue.length > 1) ||
          trimmedValue.match(HASHTAG_REGEX);

        if (couldBeHashtag) {
          newQuickActions.push({
            key: 'go-to-hashtag',
            label: (
              <FormattedMessage
                id='search.quick_action.go_to_hashtag'
                defaultMessage='Go to hashtag {x}'
                values={{ x: <mark>#{trimmedValue.replace(/^#/, '')}</mark> }}
              />
            ),
            action: () => {
              const query = trimmedValue.replace(/^#/, '');
              history.push(`/tags/${query}`);
              void dispatch(clickSearchResult({ q: query, type: 'hashtag' }));
              unfocus();
            },
          });
        }

        const couldBeUsername = /^@?[a-z0-9_-]+(@[^\s]+)?$/i.exec(trimmedValue);

        if (couldBeUsername) {
          newQuickActions.push({
            key: 'go-to-account',
            label: (
              <FormattedMessage
                id='search.quick_action.go_to_account'
                defaultMessage='Go to profile {x}'
                values={{ x: <mark>@{trimmedValue.replace(/^@/, '')}</mark> }}
              />
            ),
            action: () => {
              const query = trimmedValue.replace(/^@/, '');
              history.push(`/@${query}`);
              void dispatch(clickSearchResult({ q: query, type: 'account' }));
              unfocus();
            },
          });
        }

        const couldBeStatusSearch = searchEnabled;

        if (couldBeStatusSearch && signedIn) {
          newQuickActions.push({
            key: 'status-search',
            label: (
              <FormattedMessage
                id='search.quick_action.status_search'
                defaultMessage='Posts matching {x}'
                values={{ x: <mark>{trimmedValue}</mark> }}
              />
            ),
            action: () => {
              submit(trimmedValue, 'statuses');
            },
          });
        }

        newQuickActions.push({
          key: 'account-search',
          label: (
            <FormattedMessage
              id='search.quick_action.account_search'
              defaultMessage='Profiles matching {x}'
              values={{ x: <mark>{trimmedValue}</mark> }}
            />
          ),
          action: () => {
            submit(trimmedValue, 'accounts');
          },
        });
      }

      setQuickActions(newQuickActions);
    },
    [signedIn, dispatch, unfocus, history, submit, captureSearchScroll],
  );

  useLayoutEffect(() => {
    const snapshot = searchScrollSnapshotRef.current;
    if (
      !snapshot ||
      snapshot.input !== searchInputRef.current ||
      document.activeElement !== snapshot.input
    ) {
      return;
    }

    const restoreWhileInputFocused = () => {
      if (
        searchScrollSnapshotRef.current !== snapshot ||
        !snapshot.input.isConnected ||
        document.activeElement !== snapshot.input
      ) {
        return;
      }

      restoreSearchScrollPositions(snapshot.positions);
    };

    // Keep one stable baseline for the entire focus session. Capturing the
    // already-shifted position after every key would allow the drift to add up.
    restoreWhileInputFocused();
    window.requestAnimationFrame(() => {
      restoreWhileInputFocused();
      window.requestAnimationFrame(restoreWhileInputFocused);
    });
  }, [value]);

  const handleClear = useCallback(() => {
    setValue('');
    setQuickActions([]);
    setSelectedOption(-1);
    unfocus();
  }, [unfocus]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.currentTarget;
      const isTextEditingKey =
        e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete';

      // Snapshot scroll positions before the browser processes the keystroke.
      // The layout effect restores them after React updates the suggestion list.
      if (
        target instanceof HTMLInputElement &&
        target === searchInputRef.current &&
        isTextEditingKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        captureSearchScroll(target);
      }

      // Typed search input must not trigger global keyboard shortcuts in any
      // theme, which can move the timeline or change the page scroll position.
      e.stopPropagation();

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          searchInputRef.current?.focus();
          setExpanded(false);

          break;
        case 'ArrowDown':
          e.preventDefault();

          if (!expanded) {
            setExpanded(true);
          }

          if (navigableOptions.length > 0) {
            setSelectedOption(
              Math.min(selectedOption + 1, navigableOptions.length - 1),
            );
          }

          break;
        case 'ArrowUp':
          e.preventDefault();

          if (navigableOptions.length > 0) {
            setSelectedOption(Math.max(selectedOption - 1, -1));
          }

          break;
        case 'Enter':
          e.preventDefault();

          if (selectedOption === -1) {
            submit(value);
          } else if (navigableOptions.length > 0) {
            navigableOptions[selectedOption]?.action(e);
          }

          break;
        case 'Delete':
          if (selectedOption > -1 && navigableOptions.length > 0) {
            const search = navigableOptions[selectedOption];

            if (typeof search?.forget === 'function') {
              e.preventDefault();
              search.forget(e);
            }
          }

          break;
      }
    },
    [
      captureSearchScroll,
      expanded,
      navigableOptions,
      selectedOption,
      submit,
      value,
    ],
  );

  const handleInputFocus = useCallback(() => {
    if (shouldOpenOnFocus) {
      setExpanded(true);
      setSelectedOption(-1);
    }

    if (searchInputRef.current && !singleColumn) {
      const input = searchInputRef.current;
      const { left, right } = input.getBoundingClientRect();
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth;

      if (left < 0 || right > viewportWidth) {
        const horizontalDelta = left < 0 ? left : right - viewportWidth;
        let scrollable: HTMLElement | null = input.parentElement;

        while (scrollable && scrollable !== document.body) {
          const { overflowX } = window.getComputedStyle(scrollable);
          if (
            scrollable.scrollWidth > scrollable.clientWidth &&
            /(auto|scroll|overlay)/.test(overflowX)
          ) {
            break;
          }
          scrollable = scrollable.parentElement;
        }

        if (scrollable && scrollable !== document.body) {
          scrollable.scrollTo({
            left: scrollable.scrollLeft + horizontalDelta,
            top: scrollable.scrollTop,
            behavior: 'auto',
          });
        } else {
          window.scrollBy({ left: horizontalDelta, top: 0, behavior: 'auto' });
        }
      }
    }

    const input = searchInputRef.current;
    if (input) {
      setFocusedSearchInput(input);
      captureSearchScroll(input, true);
    }
  }, [captureSearchScroll, shouldOpenOnFocus, singleColumn]);

  const handleInputBlur = useCallback(() => {
    searchScrollSnapshotRef.current = null;
    setFocusedSearchInput(null);
    setSelectedOption(-1);
  }, []);

  const getOptionFocusHandler = useCallback((index: number) => {
    return () => {
      setSelectedOption(index);
    };
  }, []);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // If the search popover is expanded, close it when tabbing or
    // clicking outside of it or the search form, while allowing
    // tabbing or clicking inside of the popover
    if (expanded) {
      function closeOnLeave(event: FocusEvent | MouseEvent) {
        const form = formRef.current;
        const isClickInsideForm =
          form &&
          (form === event.target || form.contains(event.target as Node));
        if (!isClickInsideForm) {
          setExpanded(false);
        }
      }
      document.addEventListener('focusin', closeOnLeave);
      document.addEventListener('click', closeOnLeave);

      return () => {
        document.removeEventListener('focusin', closeOnLeave);
        document.removeEventListener('click', closeOnLeave);
      };
    }
    return () => null;
  }, [expanded]);

  const searchOptionsHeading = useId();
  let placeholder = intl.formatMessage(
    signedIn ? messages.placeholderSignedIn : messages.placeholder,
  );
  if (context === 'sidebar') {
    placeholder = intl.formatMessage(messages.placeholderSidebar);
  }

  return (
    <form
      role='search'
      ref={formRef}
      className={classNames('search', { active: expanded })}
    >
      <input
        type='text'
        inputMode='search'
        data-main-search
        ref={context === 'column' ? setSearchInputRef : searchInputRef}
        className={classes.search}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onBeforeInput={handleBeforeInput}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
      />

      <ClearButton hasValue={hasValue} onClick={handleClear} />

      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className='search__popout'
        role='dialog'
        tabIndex={-1}
        aria-labelledby={searchOptionsHeading}
        onKeyDown={handleKeyDown}
      >
        {!hasValue && (
          <>
            <h4>
              <FormattedMessage
                id='search_popout.recent'
                defaultMessage='Recent searches'
              />
            </h4>

            <div className='search__popout__menu'>
              {recentOptions.length > 0 ? (
                recentOptions.map(({ label, key, action, forget }, i) => (
                  <div
                    key={key}
                    tabIndex={0}
                    role='button'
                    onMouseDown={action}
                    onFocus={getOptionFocusHandler(i)}
                    className={classNames(
                      'search__popout__menu__item search__popout__menu__item--flex',
                      { selected: selectedOption === i },
                    )}
                  >
                    <span>{label}</span>
                    <button
                      className='icon-button'
                      onMouseDown={forget}
                      type='button'
                    >
                      <Icon id='times' icon={XIcon} />
                    </button>
                  </div>
                ))
              ) : (
                <div className='search__popout__menu__message'>
                  <FormattedMessage
                    id='search.no_recent_searches'
                    defaultMessage='No recent searches'
                  />
                </div>
              )}
            </div>
          </>
        )}

        {quickActions.length > 0 && (
          <>
            <h4>
              <FormattedMessage
                id='search_popout.quick_actions'
                defaultMessage='Quick actions'
              />
            </h4>

            <div className='search__popout__menu'>
              {quickActions.map(({ key, label, action }, i) => (
                <button
                  key={key}
                  onMouseDown={action}
                  onFocus={getOptionFocusHandler(i)}
                  className={classNames('search__popout__menu__item', {
                    selected: selectedOption === i,
                  })}
                  type='button'
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        <h4 id={searchOptionsHeading}>
          <FormattedMessage
            id='search_popout.options'
            defaultMessage='Search options'
          />
        </h4>

        {searchEnabled && signedIn ? (
          <div className='search__popout__menu'>
            {searchOptions.map(({ key, label, action }, i) => {
              const currentIndex = (quickActions.length || recent.length) + i;
              return (
                <button
                  key={key}
                  onMouseDown={action}
                  onFocus={getOptionFocusHandler(currentIndex)}
                  className={classNames('search__popout__menu__item', {
                    selected: selectedOption === currentIndex,
                  })}
                  type='button'
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className='search__popout__menu__message'>
            {searchEnabled ? (
              <FormattedMessage
                id='search_popout.full_text_search_logged_out_message'
                defaultMessage='Only available when logged in.'
              />
            ) : (
              <FormattedMessage
                id='search_popout.full_text_search_disabled_message'
                defaultMessage='Not available on {domain}.'
                values={{ domain }}
              />
            )}
          </div>
        )}
      </div>
    </form>
  );
};
