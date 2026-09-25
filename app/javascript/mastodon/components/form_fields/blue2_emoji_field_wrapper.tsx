import type {
  ChangeEvent,
  FC,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  SyntheticEvent,
} from 'react';
import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import classNames from 'classnames';

import { textAtCursorMatchesToken } from '@/mastodon/components/autosuggest/utils';
import { AutosuggestEmoji } from '@/mastodon/components/autosuggest_emoji';
import { LocalCustomEmojiProvider } from '@/mastodon/components/emoji/context';
import { Popover } from '@/mastodon/components/popover';
import type { ExtraCustomEmojiMap } from '@/mastodon/features/emoji/types';
import { useCustomEmojis } from '@/mastodon/hooks/useCustomEmojis';
import { autoPlayGif } from '@/mastodon/initial_state';

import { CharacterCounter } from '../character_counter';
import { EmojiPickerButton } from '../emoji/picker_button';

import { clearEmptyProfileEmojiEditorPlaceholder } from './blue2_emoji_field_dom';
import {
  customEmojiDeletionRange,
  customEmojiEditorRenderKey,
  customEmojiTextParts,
  insertEmojiAtSelection,
  matchingCustomEmojiShortcodes,
  profileEmojiEditorSelection,
  profileEmojiEditorText,
  setProfileEmojiEditorSelection,
} from './blue2_emoji_field_utils';
import type {
  EmojiFieldWrapperProps,
  EmojiInputElement,
} from './emoji_text_field';
import classes from './emoji_text_field.module.scss';
import { FormFieldWrapper } from './form_field_wrapper';

export const isBlue2Theme = () =>
  typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';

export const isBirdUiTheme = () =>
  typeof document !== 'undefined' &&
  document.body.dataset.theme === 'mastodon-bird-ui-auto';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttribute = (value: string) =>
  escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const buildEditorHtml = (
  parts: ReturnType<typeof customEmojiTextParts>,
  customEmojis: ExtraCustomEmojiMap,
) =>
  parts
    .map((part) => {
      if (part.type === 'text') return escapeHtml(part.text);

      const emoji = customEmojis[part.code];
      if (!emoji) return escapeHtml(part.shortcode);

      const animatedUrl = emoji.url || emoji.static_url;
      const staticUrl = emoji.static_url || emoji.url;
      const src = autoPlayGif ? animatedUrl : staticUrl;

      return `<span data-emoji-shortcode="${escapeAttribute(part.shortcode)}" contenteditable="false" class="${escapeAttribute(classes.blue2EmojiToken ?? '')}"><img src="${escapeAttribute(src)}" data-blue2-emoji-animated-url="${escapeAttribute(animatedUrl)}" data-blue2-emoji-static-url="${escapeAttribute(staticUrl)}" alt="${escapeAttribute(part.shortcode)}" class="emojione custom-emoji" loading="lazy" draggable="false" /></span>`;
    })
    .join('');

const setEditorEmojiAnimation = (editor: HTMLElement, animate: boolean) => {
  editor
    .querySelectorAll<HTMLImageElement>(
      'img[data-blue2-emoji-animated-url][data-blue2-emoji-static-url]',
    )
    .forEach((image) => {
      const src = animate
        ? image.dataset.blue2EmojiAnimatedUrl
        : image.dataset.blue2EmojiStaticUrl;
      if (src && image.getAttribute('src') !== src) image.src = src;
    });
};

export const Blue2EmojiFieldWrapper: FC<EmojiFieldWrapperProps> = ({
  value,
  onChange,
  children,
  disabled,
  inputRef,
  counterMax,
  recommended = false,
  maxLength,
  blue2EmojiEditor: _blue2EmojiEditor,
  mastodon5EmojiEditor: _mastodon5EmojiEditor,
  ...otherProps
}) => {
  const counterId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const customEmojis = useCustomEmojis();
  const inputValue = value ?? '';
  const [inputElement, setInputElement] = useState<EmojiInputElement | null>(
    null,
  );
  const [suggestionCodes, setSuggestionCodes] = useState<string[]>([]);
  const [suggestionsHidden, setSuggestionsHidden] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [activeToken, setActiveToken] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(
    null,
  );
  const pendingRenderValueRef = useRef<string | null>(null);
  const lastSelectionRef = useRef<{ start: number; end: number } | null>(null);

  const parts = useMemo(
    () => customEmojiTextParts(inputValue, customEmojis),
    [customEmojis, inputValue],
  );
  const editorRenderKey = useMemo(
    () => customEmojiEditorRenderKey(parts),
    [parts],
  );
  const inputLabel =
    inputElement?.labels?.[0]?.textContent.trim() ??
    inputElement?.getAttribute('aria-label') ??
    undefined;

  const hideSuggestions = useCallback(() => {
    setSuggestionCodes([]);
    setSuggestionsHidden(true);
    setSelectedSuggestion(0);
    setActiveToken(null);
  }, []);

  const updateSuggestions = useCallback(
    (text: string, caretPosition: number) => {
      const [tokenStart, token] = textAtCursorMatchesToken(
        text,
        caretPosition,
        [':'],
      );
      if (tokenStart === null) {
        hideSuggestions();
        return;
      }

      const matches = matchingCustomEmojiShortcodes(customEmojis, token);
      if (matches.length === 0) {
        hideSuggestions();
        return;
      }

      const start = Math.max(0, tokenStart - 1);
      setSuggestionCodes(matches);
      setSelectedSuggestion(0);
      setActiveToken({ start, end: start + token.length });
      setSuggestionsHidden(false);
    },
    [customEmojis, hideSuggestions],
  );

  const syncSourceSelection = useCallback(() => {
    const editor = editorRef.current;
    const input = inputRef.current;
    if (!editor || !input) return null;

    const selection = profileEmojiEditorSelection(editor);
    input.setSelectionRange(selection.start, selection.end);
    lastSelectionRef.current = selection;
    return selection;
  }, [inputRef]);

  const syncFromEditor = useCallback(() => {
    const editor = editorRef.current;
    const input = inputRef.current;
    if (!editor || !input) return;

    const rawText = profileEmojiEditorText(editor);
    const rawSelection = profileEmojiEditorSelection(editor);
    const normalizeText = (text: string) =>
      input instanceof HTMLInputElement ? text.replace(/[\r\n]/g, '') : text;
    const normalizedText = normalizeText(rawText);
    const text =
      maxLength === undefined
        ? normalizedText
        : normalizedText.slice(0, maxLength);
    const selection = {
      start: Math.min(
        normalizeText(rawText.slice(0, rawSelection.start)).length,
        text.length,
      ),
      end: Math.min(
        normalizeText(rawText.slice(0, rawSelection.end)).length,
        text.length,
      ),
    };
    const nextRenderKey = customEmojiEditorRenderKey(
      customEmojiTextParts(text, customEmojis),
    );
    const needsCanonicalRender =
      nextRenderKey !== editorRenderKey || text !== rawText;

    input.value = text;
    input.setSelectionRange(selection.start, selection.end);
    if (needsCanonicalRender) {
      pendingSelectionRef.current = selection;
      pendingRenderValueRef.current = text;
    }
    lastSelectionRef.current = selection;
    onChange?.(text);
    updateSuggestions(text, selection.end);
  }, [
    customEmojis,
    editorRenderKey,
    inputRef,
    maxLength,
    onChange,
    updateSuggestions,
  ]);

  const applyEmoji = useCallback(
    (emoji: string, start: number, end: number) => {
      const currentValue = inputRef.current?.value ?? inputValue;
      const insertion = insertEmojiAtSelection(
        currentValue,
        emoji,
        start,
        end,
        maxLength,
      );
      if (!insertion) return;

      const selection = {
        start: insertion.caretPosition,
        end: insertion.caretPosition,
      };
      pendingSelectionRef.current = selection;
      pendingRenderValueRef.current = insertion.value;
      lastSelectionRef.current = selection;
      if (inputRef.current) {
        inputRef.current.value = insertion.value;
        inputRef.current.setSelectionRange(selection.start, selection.end);
      }
      hideSuggestions();
      onChange?.(insertion.value);
    },
    [hideSuggestions, inputRef, inputValue, maxLength, onChange],
  );

  const selectSuggestion = useCallback(
    (index: number) => {
      const shortcode = suggestionCodes[index];
      if (!shortcode || !activeToken) return;
      applyEmoji(`:${shortcode}:`, activeToken.start, activeToken.end);
    },
    [activeToken, applyEmoji, suggestionCodes],
  );

  const handlePickEmoji = useCallback(
    (emoji: string) => {
      const input = inputRef.current;
      const currentValue = input?.value ?? inputValue;
      const rememberedSelection = lastSelectionRef.current;
      const start =
        rememberedSelection?.start ??
        input?.selectionStart ??
        currentValue.length;
      const end = rememberedSelection?.end ?? input?.selectionEnd ?? start;
      applyEmoji(emoji, start, end);
    },
    [applyEmoji, inputRef, inputValue],
  );

  const handleSourceChange = useCallback(
    (event: ChangeEvent<EmojiInputElement>) => {
      onChange?.(event.target.value);
    },
    [onChange],
  );

  const resetEmptyEditorPlaceholder = useCallback(
    (editor: HTMLDivElement) => {
      if (!clearEmptyProfileEmojiEditorPlaceholder(editor, inputValue)) return;

      const selection = { start: 0, end: 0 };
      lastSelectionRef.current = selection;
      setProfileEmojiEditorSelection(editor, 0);
    },
    [inputValue],
  );

  const deleteAdjacentCustomEmoji = useCallback(
    (editor: HTMLDivElement, direction: 'backward' | 'forward') => {
      const selection = profileEmojiEditorSelection(editor);
      if (selection.start !== selection.end) return false;

      const currentValue = inputRef.current?.value ?? inputValue;
      const deletionRange = customEmojiDeletionRange(
        currentValue,
        customEmojis,
        selection.start,
        direction,
      );
      if (!deletionRange) return false;

      const nextValue =
        currentValue.slice(0, deletionRange.start) +
        currentValue.slice(deletionRange.end);
      const nextSelection = {
        start: deletionRange.start,
        end: deletionRange.start,
      };

      // Keep the visible editor in lockstep with the hidden source value.
      // Mobile keyboards can emit the next repeated beforeinput before React
      // commits onChange, so waiting for useLayoutEffect leaves a stale DOM.
      editor.innerHTML = buildEditorHtml(
        customEmojiTextParts(nextValue, customEmojis),
        customEmojis,
      );
      setEditorEmojiAnimation(editor, Boolean(autoPlayGif));
      setProfileEmojiEditorSelection(
        editor,
        nextSelection.start,
        nextSelection.end,
      );
      pendingSelectionRef.current = null;
      pendingRenderValueRef.current = null;
      lastSelectionRef.current = nextSelection;

      if (inputRef.current) {
        inputRef.current.value = nextValue;
        inputRef.current.setSelectionRange(
          nextSelection.start,
          nextSelection.end,
        );
      }
      hideSuggestions();
      onChange?.(nextValue);
      return true;
    },
    [customEmojis, hideSuggestions, inputRef, inputValue, onChange],
  );

  const handleEditorBeforeInput = useCallback(
    (event: SyntheticEvent<HTMLDivElement>) => {
      const editor = event.currentTarget;
      resetEmptyEditorPlaceholder(editor);

      const inputEvent = event.nativeEvent as InputEvent;
      if (inputEvent.isComposing) return;

      const direction =
        inputEvent.inputType === 'deleteContentBackward'
          ? 'backward'
          : inputEvent.inputType === 'deleteContentForward'
            ? 'forward'
            : null;

      if (direction && deleteAdjacentCustomEmoji(editor, direction)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [deleteAdjacentCustomEmoji, resetEmptyEditorPlaceholder],
  );

  const handleEditorInput = useCallback(() => {
    syncFromEditor();
  }, [syncFromEditor]);

  const handleEditorSelection = useCallback(() => {
    const selection = syncSourceSelection();
    const editor = editorRef.current;
    if (!selection || !editor) return;
    updateSuggestions(profileEmojiEditorText(editor), selection.end);
  }, [syncSourceSelection, updateSuggestions]);

  const handleFocusCapture = useCallback(
    (event: SyntheticEvent) => {
      const input = inputRef.current;
      const editor = editorRef.current;
      if (!input || !editor) return;

      setInputElement(input);
      if (event.target === input) {
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        const selection = { start, end };
        lastSelectionRef.current = selection;
        editor.focus({ preventScroll: true });
        setProfileEmojiEditorSelection(editor, start, end);
      } else if (event.target === editor) {
        resetEmptyEditorPlaceholder(editor);
        handleEditorSelection();
      }
    },
    [handleEditorSelection, inputRef, resetEmptyEditorPlaceholder],
  );

  const handleBlurCapture = useCallback(
    (event: SyntheticEvent) => {
      if (event.target !== editorRef.current) return;
      setSuggestionsHidden(true);
      inputRef.current?.dispatchEvent(
        new FocusEvent('focusout', { bubbles: true }),
      );
    },
    [inputRef],
  );

  const handleEditorMouseEnter = useCallback(() => {
    if (!autoPlayGif && editorRef.current) {
      setEditorEmojiAnimation(editorRef.current, true);
    }
  }, []);

  const handleEditorMouseLeave = useCallback(() => {
    if (!autoPlayGif && editorRef.current) {
      setEditorEmojiAnimation(editorRef.current, false);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const editor = editorRef.current;
      if (event.target !== editor || event.nativeEvent.isComposing) {
        return;
      }

      if (!suggestionsHidden && suggestionCodes.length > 0) {
        switch (event.key) {
          case 'Escape':
            event.preventDefault();
            event.stopPropagation();
            setSuggestionsHidden(true);
            return;
          case 'ArrowDown':
            event.preventDefault();
            event.stopPropagation();
            setSelectedSuggestion((current) =>
              Math.min(current + 1, suggestionCodes.length - 1),
            );
            return;
          case 'ArrowUp':
            event.preventDefault();
            event.stopPropagation();
            setSelectedSuggestion((current) => Math.max(current - 1, 0));
            return;
          case 'Enter':
          case 'Tab':
            event.preventDefault();
            event.stopPropagation();
            selectSuggestion(selectedSuggestion);
            return;
        }
      }

      if (
        (event.key === 'Backspace' &&
          deleteAdjacentCustomEmoji(editor, 'backward')) ||
        (event.key === 'Delete' && deleteAdjacentCustomEmoji(editor, 'forward'))
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (
        event.key === 'Enter' &&
        inputRef.current instanceof HTMLInputElement
      ) {
        event.preventDefault();
        return;
      }

      requestAnimationFrame(handleEditorSelection);
    },
    [
      deleteAdjacentCustomEmoji,
      handleEditorSelection,
      inputRef,
      selectedSuggestion,
      selectSuggestion,
      suggestionCodes.length,
      suggestionsHidden,
    ],
  );

  const handleSuggestionMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      selectSuggestion(Number(event.currentTarget.dataset.index));
    },
    [selectSuggestion],
  );

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const pendingSelection = pendingSelectionRef.current;
    const pendingValueMatches = pendingRenderValueRef.current === inputValue;
    const liveValue = profileEmojiEditorText(editor);
    const isFocused = document.activeElement === editor;
    const hasPendingRender = pendingSelection !== null && pendingValueMatches;
    const needsExternalSync = !isFocused && liveValue !== inputValue;

    if (hasPendingRender || needsExternalSync) {
      editor.innerHTML = buildEditorHtml(
        customEmojiTextParts(inputValue, customEmojis),
        customEmojis,
      );
    }

    setEditorEmojiAnimation(editor, Boolean(autoPlayGif));

    if (pendingSelection !== null && pendingValueMatches) {
      if (isFocused) {
        setProfileEmojiEditorSelection(
          editor,
          pendingSelection.start,
          pendingSelection.end,
        );
      }
      pendingSelectionRef.current = null;
      pendingRenderValueRef.current = null;
    }
  }, [customEmojis, inputValue]);

  return (
    <div
      className={classes.blue2Behavior}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <LocalCustomEmojiProvider>
        <FormFieldWrapper
          className={classNames(
            classes.fieldWrapper,
            classes.blue2FieldWrapper,
          )}
          describedById={counterId}
          {...otherProps}
        >
          {(inputProps) => (
            <>
              {children({ ...inputProps, onChange: handleSourceChange })}
              <div
                ref={editorRef}
                className={classes.blue2Editor}
                contentEditable={!disabled}
                suppressContentEditableWarning
                role='textbox'
                tabIndex={disabled ? -1 : 0}
                aria-multiline={inputElement instanceof HTMLTextAreaElement}
                aria-describedby={inputProps['aria-describedby']}
                aria-labelledby={
                  inputElement?.getAttribute('aria-labelledby') ?? undefined
                }
                aria-label={inputLabel}
                aria-required={inputProps.required}
                spellCheck
                onBeforeInput={handleEditorBeforeInput}
                onInput={handleEditorInput}
                onClick={handleEditorSelection}
                onMouseUp={handleEditorSelection}
                onKeyUp={handleEditorSelection}
                onKeyDown={handleKeyDown}
                onMouseEnter={handleEditorMouseEnter}
                onMouseLeave={handleEditorMouseLeave}
              />
              <EmojiPickerButton onPick={handlePickEmoji} disabled={disabled} />
              {counterMax && (
                <CharacterCounter
                  currentString={inputValue}
                  maxLength={counterMax}
                  recommended={recommended}
                  id={counterId}
                />
              )}
            </>
          )}
        </FormFieldWrapper>

        <Popover
          matchReferenceWidth
          isOpen={
            !suggestionsHidden &&
            suggestionCodes.length > 0 &&
            inputElement !== null
          }
          onClose={hideSuggestions}
          reference={inputElement}
        >
          {({ props: popoverProps }) => (
            <div {...popoverProps}>
              <div
                className='autosuggest-textarea__suggestions'
                style={{ width: inputElement?.clientWidth }}
              >
                {suggestionCodes.map((shortcode, index) => (
                  <div
                    role='button'
                    tabIndex={0}
                    key={shortcode}
                    data-index={index}
                    className={classNames(
                      'autosuggest-textarea__suggestions__item',
                      { selected: index === selectedSuggestion },
                    )}
                    onMouseDown={handleSuggestionMouseDown}
                  >
                    <AutosuggestEmoji emoji={{ id: shortcode, custom: true }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Popover>
      </LocalCustomEmojiProvider>
    </div>
  );
};
