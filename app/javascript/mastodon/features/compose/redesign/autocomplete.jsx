import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';

import classNames from 'classnames';

import {
  clearComposeSuggestions,
  fetchComposeSuggestions,
} from '@/mastodon/actions/compose';
import { emojiUse } from '@/mastodon/actions/emojis';
import { AutosuggestEmoji } from '@/mastodon/components/autosuggest_emoji';
import { textAtCursorMatchesToken } from '@/mastodon/components/autosuggest/utils';
import { LocalCustomEmojiProvider } from '@/mastodon/components/emoji/context';
import { Popover } from '@/mastodon/components/popover';
import { useCustomEmojis } from '@/mastodon/hooks/useCustomEmojis';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import AutosuggestAccountContainer from '../containers/autosuggest_account_container';

const SEARCH_TOKENS = ['@', '＠', ':'];
const WRAPPER_STYLE = { display: 'contents' };

const nodeAutocompleteText = (node) => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';

  const shortcode = node.dataset.emojiShortcode;
  if (shortcode) return shortcode;
  if (node.tagName === 'BR') return '\n';

  const content = Array.from(node.childNodes)
    .map(nodeAutocompleteText)
    .join('');

  if (node.tagName === 'DIV' || node.tagName === 'P') return `\n${content}`;
  return content;
};

export const editorAutocompleteText = (editor) =>
  Array.from(editor.childNodes).map(nodeAutocompleteText).join('');

export const getEditorAutocompleteContext = (editor) => {
  const value = editorAutocompleteText(editor);
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return { value, caretPosition: value.length };
  }

  const activeRange = selection.getRangeAt(0);
  if (!editor.contains(activeRange.startContainer)) {
    return { value, caretPosition: value.length };
  }

  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(editor);
  beforeRange.setEnd(activeRange.startContainer, activeRange.startOffset);

  const container = document.createElement('div');
  container.append(beforeRange.cloneContents());

  return {
    value,
    caretPosition: editorAutocompleteText(container).length,
  };
};

const pointAtAutocompleteOffset = (editor, targetOffset) => {
  let remaining = Math.max(0, targetOffset);
  let point = null;

  const pointBeforeOrAfter = (element, after) => {
    const parent = element.parentNode;
    if (!parent) return null;
    const index = Array.prototype.indexOf.call(parent.childNodes, element);
    return { node: parent, offset: index + (after ? 1 : 0) };
  };

  const consumeVirtualCharacter = (element) => {
    if (remaining === 0) {
      point = pointBeforeOrAfter(element, false);
      return true;
    }

    remaining -= 1;
    return false;
  };

  const visit = (node) => {
    if (point) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) {
        point = { node, offset: remaining };
      } else {
        remaining -= length;
      }
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    const shortcode = node.dataset.emojiShortcode;
    if (shortcode) {
      if (remaining === 0) {
        point = pointBeforeOrAfter(node, false);
      } else if (remaining <= shortcode.length) {
        point = pointBeforeOrAfter(node, true);
      } else {
        remaining -= shortcode.length;
      }
      return;
    }

    if (node.tagName === 'BR') {
      if (remaining <= 1) {
        point = pointBeforeOrAfter(node, remaining === 1);
      } else {
        remaining -= 1;
      }
      return;
    }

    if (
      (node.tagName === 'DIV' || node.tagName === 'P') &&
      consumeVirtualCharacter(node)
    ) {
      return;
    }

    for (const child of Array.from(node.childNodes)) {
      visit(child);
      if (point) return;
    }
  };

  for (const child of Array.from(editor.childNodes)) {
    visit(child);
    if (point) break;
  }

  return point ?? { node: editor, offset: editor.childNodes.length };
};

const createCustomEmojiElement = (shortcode, emoji) => {
  const span = document.createElement('span');
  span.dataset.emojiShortcode = shortcode;
  span.contentEditable = 'false';

  const image = document.createElement('img');
  image.src = emoji.url || emoji.static_url;
  image.alt = shortcode;
  image.draggable = false;
  span.appendChild(image);

  return span;
};

export const renderCompletedCustomEmoji = (editor, customEmojis) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  if (!range.collapsed || !editor.contains(range.startContainer)) return false;
  if (range.startContainer.nodeType !== Node.TEXT_NODE) return false;

  const textNode = range.startContainer;
  const source = textNode.textContent ?? '';
  const beforeCaret = source.slice(0, range.startOffset);
  const match = /:([a-zA-Z0-9_+-]+):$/.exec(beforeCaret);
  if (!match) return false;

  const shortcode = match[0];
  const emoji = customEmojis[match[1]];
  if (!emoji) return false;

  const tokenStart = range.startOffset - shortcode.length;
  const parent = textNode.parentNode;
  if (!parent) return false;

  const fragment = document.createDocumentFragment();
  const before = source.slice(0, tokenStart);
  const after = source.slice(range.startOffset);

  if (before) fragment.appendChild(document.createTextNode(before));
  const emojiElement = createCustomEmojiElement(shortcode, emoji);
  fragment.appendChild(emojiElement);
  if (after) fragment.appendChild(document.createTextNode(after));

  parent.replaceChild(fragment, textNode);

  const nextRange = document.createRange();
  nextRange.setStartAfter(emojiElement);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);

  return true;
};

const buildSuggestionFragment = (suggestion, accounts, customEmojis) => {
  const fragment = document.createDocumentFragment();
  let insertedTail = null;

  if (suggestion.type === 'account') {
    const acct = accounts.getIn([suggestion.id, 'acct']);
    if (!acct) return null;
    insertedTail = document.createTextNode(`@${acct} `);
    fragment.appendChild(insertedTail);
  } else if (suggestion.type === 'emoji') {
    if (suggestion.native) {
      insertedTail = document.createTextNode(`${suggestion.native} `);
      fragment.appendChild(insertedTail);
    } else {
      const shortcode = `:${suggestion.id}:`;
      const emoji = customEmojis[suggestion.id];
      if (emoji) {
        fragment.appendChild(createCustomEmojiElement(shortcode, emoji));
        insertedTail = document.createTextNode(' ');
        fragment.appendChild(insertedTail);
      } else {
        insertedTail = document.createTextNode(`${shortcode} `);
        fragment.appendChild(insertedTail);
      }
    }
  } else {
    return null;
  }

  return { fragment, insertedTail };
};

const replaceAutocompleteRange = (
  editor,
  start,
  end,
  suggestion,
  accounts,
  customEmojis,
) => {
  const insertion = buildSuggestionFragment(
    suggestion,
    accounts,
    customEmojis,
  );
  if (!insertion) return false;

  const startPoint = pointAtAutocompleteOffset(editor, start);
  const endPoint = pointAtAutocompleteOffset(editor, end);
  const range = document.createRange();

  try {
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
  } catch {
    return false;
  }

  range.deleteContents();
  range.insertNode(insertion.fragment);

  const selection = window.getSelection();
  if (selection && insertion.insertedTail) {
    const nextRange = document.createRange();
    nextRange.setStartAfter(insertion.insertedTail);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }

  return true;
};

const findEditor = (target) => {
  if (!(target instanceof Element)) return null;
  const editor = target.closest('[data-compose-scroll-zone="editor"]');
  return editor instanceof HTMLElement ? editor : null;
};

export const ComposeAutocomplete = ({ children }) => {
  const dispatch = useAppDispatch();
  const suggestions = useAppSelector((state) => state.compose.get('suggestions'));
  const accounts = useAppSelector((state) => state.accounts);
  const customEmojis = useCustomEmojis();

  const [editorElement, setEditorElement] = useState(null);
  const [suggestionsHidden, setSuggestionsHidden] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const lastTokenRef = useRef(null);
  const tokenStartRef = useRef(0);
  const skipNextInputRef = useRef(false);

  const clearSuggestions = useCallback(() => {
    lastTokenRef.current = null;
    setSuggestionsHidden(true);
    setSelectedSuggestion(0);
    dispatch(clearComposeSuggestions());
  }, [dispatch]);

  const updateSuggestions = useCallback(
    (editor) => {
      const { value, caretPosition } = getEditorAutocompleteContext(editor);
      const [tokenStart, token] = textAtCursorMatchesToken(
        value,
        caretPosition,
        SEARCH_TOKENS,
      );

      if (token !== null && lastTokenRef.current !== token) {
        tokenStartRef.current = tokenStart;
        lastTokenRef.current = token;
        setSelectedSuggestion(0);
        dispatch(fetchComposeSuggestions(token));
      } else if (token === null && lastTokenRef.current !== null) {
        clearSuggestions();
      }
    },
    [clearSuggestions, dispatch],
  );

  const handleFocusCapture = useCallback((event) => {
    const editor = findEditor(event.target);
    if (editor) setEditorElement(editor);
  }, []);

  const handleInputCapture = useCallback(
    (event) => {
      const editor = findEditor(event.target);
      if (!editor) return;

      setEditorElement(editor);

      if (skipNextInputRef.current) {
        skipNextInputRef.current = false;
        return;
      }

      if (renderCompletedCustomEmoji(editor, customEmojis)) {
        clearSuggestions();
        return;
      }

      updateSuggestions(editor);
    },
    [clearSuggestions, customEmojis, updateSuggestions],
  );

  const selectSuggestion = useCallback(
    (index) => {
      const suggestion = suggestions.get(index);
      const token = lastTokenRef.current;
      const editor = editorElement;
      const tokenStart = tokenStartRef.current;

      if (!suggestion || !token || !editor || tokenStart === null) return;

      const start = Math.max(0, tokenStart - 1);
      const end = start + token.length;
      const replaced = replaceAutocompleteRange(
        editor,
        start,
        end,
        suggestion,
        accounts,
        customEmojis,
      );

      if (!replaced) return;

      if (suggestion.type === 'emoji') dispatch(emojiUse(suggestion));

      skipNextInputRef.current = true;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      clearSuggestions();
      editor.focus({ preventScroll: true });
    },
    [
      accounts,
      clearSuggestions,
      customEmojis,
      dispatch,
      editorElement,
      suggestions,
    ],
  );

  const handleKeyDownCapture = useCallback(
    (event) => {
      const editor = findEditor(event.target);
      if (!editor || event.nativeEvent?.isComposing || event.which === 229) return;
      if (suggestionsHidden || suggestions.size === 0) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          setSuggestionsHidden(true);
          break;
        case 'ArrowDown':
          event.preventDefault();
          event.stopPropagation();
          setSelectedSuggestion((current) =>
            Math.min(current + 1, suggestions.size - 1),
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          event.stopPropagation();
          setSelectedSuggestion((current) => Math.max(current - 1, 0));
          break;
        case 'Enter':
        case 'Tab':
          event.preventDefault();
          event.stopPropagation();
          selectSuggestion(selectedSuggestion);
          break;
      }
    },
    [selectedSuggestion, selectSuggestion, suggestions, suggestionsHidden],
  );

  const handleSuggestionMouseDown = useCallback(
    (event) => {
      event.preventDefault();
      const index = Number(event.currentTarget.getAttribute('data-index'));
      selectSuggestion(index);
    },
    [selectSuggestion],
  );

  const closeMenu = useCallback(() => {
    setSuggestionsHidden(true);
  }, []);

  useEffect(() => {
    if (
      suggestions.size > 0 &&
      editorElement &&
      editorElement === document.activeElement
    ) {
      setSuggestionsHidden(false);
    }
  }, [editorElement, suggestions]);

  useEffect(() => {
    if (suggestions.size === 0) setSuggestionsHidden(true);
  }, [suggestions]);

  const renderSuggestion = useCallback(
    (suggestion, index) => {
      let content = null;
      let key = `${suggestion.type}-${index}`;

      if (suggestion.type === 'emoji') {
        content = <AutosuggestEmoji emoji={suggestion} />;
        key = `emoji-${suggestion.id}`;
      } else if (suggestion.type === 'account') {
        content = <AutosuggestAccountContainer id={suggestion.id} />;
        key = `account-${suggestion.id}`;
      } else {
        return null;
      }

      return (
        <div
          role='button'
          tabIndex={0}
          key={key}
          data-index={index}
          className={classNames('autosuggest-textarea__suggestions__item', {
            selected: index === selectedSuggestion,
          })}
          onMouseDown={handleSuggestionMouseDown}
        >
          {content}
        </div>
      );
    },
    [handleSuggestionMouseDown, selectedSuggestion],
  );

  return (
    <div
      style={WRAPPER_STYLE}
      onFocusCapture={handleFocusCapture}
      onInputCapture={handleInputCapture}
      onKeyDownCapture={handleKeyDownCapture}
    >
      {children}

      <LocalCustomEmojiProvider>
        <Popover
          matchReferenceWidth
          isOpen={
            !!editorElement &&
            !suggestionsHidden &&
            suggestions.size > 0
          }
          onClose={closeMenu}
          reference={editorElement}
        >
          {({ props }) => (
            <div {...props}>
              <div
                className='autosuggest-textarea__suggestions'
                style={{ width: editorElement?.clientWidth }}
              >
                {suggestions.map(renderSuggestion)}
              </div>
            </div>
          )}
        </Popover>
      </LocalCustomEmojiProvider>
    </div>
  );
};

ComposeAutocomplete.propTypes = {
  children: PropTypes.node.isRequired,
};
