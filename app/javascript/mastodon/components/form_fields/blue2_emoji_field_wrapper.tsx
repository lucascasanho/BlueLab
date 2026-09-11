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

import { AutosuggestEmoji } from '@/mastodon/components/autosuggest_emoji';
import { textAtCursorMatchesToken } from '@/mastodon/components/autosuggest/utils';
import { Emoji } from '@/mastodon/components/emoji';
import { LocalCustomEmojiProvider } from '@/mastodon/components/emoji/context';
import { Popover } from '@/mastodon/components/popover';
import { useCustomEmojis } from '@/mastodon/hooks/useCustomEmojis';

import { CharacterCounter } from '../character_counter';
import { EmojiPickerButton } from '../emoji/picker_button';

import {
  customEmojiTextParts,
  insertEmojiAtSelection,
  matchingCustomEmojiShortcodes,
  profileEmojiEditorSelection,
  profileEmojiEditorText,
  setProfileEmojiEditorSelection,
} from './blue2_emoji_field_utils';
import classes from './emoji_text_field.module.scss';
import type {
  EmojiFieldWrapperProps,
  EmojiInputElement,
} from './emoji_text_field';
import { FormFieldWrapper } from './form_field_wrapper';

export const isBlue2Theme = () =>
  typeof document !== 'undefined' && document.body.dataset.theme === 'blue-2';

export const Blue2EmojiFieldWrapper: FC<EmojiFieldWrapperProps> = ({
  value,
  onChange,
  children,
  disabled,
  inputRef,
  counterMax,
  recommended = false,
  maxLength,
  ...otherProps
}) => {
  const counterId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const customEmojis = useCustomEmojis();
  const inputValue = value ?? '';
  const [inputElement, setInputElement] = useState<EmojiInputElement | null>(null);
  const [suggestionCodes, setSuggestionCodes] = useState<string[]>([]);
  const [suggestionsHidden, setSuggestionsHidden] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [activeToken, setActiveToken] = useState<{ start: number; end: number } | null>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);

  const parts = useMemo(
    () => customEmojiTextParts(inputValue, customEmojis),
    [customEmojis, inputValue],
  );

  const hideSuggestions = useCallback(() => {
    setSuggestionCodes([]);
    setSuggestionsHidden(true);
    setSelectedSuggestion(0);
    setActiveToken(null);
  }, []);

  const updateSuggestions = useCallback(
    (text: string, caretPosition: number) => {
      const [tokenStart, token] = textAtCursorMatchesToken(text, caretPosition, [':']);
      if (tokenStart === null || token === null) {
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
    return selection;
  }, [inputRef]);

  const syncFromEditor = useCallback(() => {
    const editor = editorRef.current;
    const input = inputRef.current;
    if (!editor || !input) return;

    const rawText = profileEmojiEditorText(editor);
    const text = maxLength ? rawText.slice(0, maxLength) : rawText;
    const rawSelection = profileEmojiEditorSelection(editor);
    const selection = {
      start: Math.min(rawSelection.start, text.length),
      end: Math.min(rawSelection.end, text.length),
    };
    input.value = text;
    input.setSelectionRange(selection.start, selection.end);
    pendingSelectionRef.current = selection;
    onChange?.(text);
    updateSuggestions(text, selection.end);
  }, [inputRef, maxLength, onChange, updateSuggestions]);

  const applyEmoji = useCallback(
    (emoji: string, start: number, end: number) => {
      const currentValue = inputRef.current?.value ?? inputValue;
      const insertion = insertEmojiAtSelection(currentValue, emoji, start, end);
      const selection = {
        start: insertion.caretPosition,
        end: insertion.caretPosition,
      };
      pendingSelectionRef.current = selection;
      if (inputRef.current) {
        inputRef.current.value = insertion.value;
        inputRef.current.setSelectionRange(selection.start, selection.end);
      }
      hideSuggestions();
      onChange?.(insertion.value);
    },
    [hideSuggestions, inputRef, inputValue, onChange],
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
      const start = input?.selectionStart ?? currentValue.length;
      const end = input?.selectionEnd ?? start;
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
        editor.focus({ preventScroll: true });
        setProfileEmojiEditorSelection(editor, start, end);
      } else if (event.target === editor) {
        handleEditorSelection();
      }
    },
    [handleEditorSelection, inputRef],
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

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.target !== editorRef.current || event.nativeEvent.isComposing) return;

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
            setSelectedSuggestion((current) => Math.min(current + 1, suggestionCodes.length - 1));
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

      if (event.key === 'Enter' && inputRef.current instanceof HTMLInputElement) {
        event.preventDefault();
        return;
      }

      requestAnimationFrame(handleEditorSelection);
    },
    [
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
    const pendingSelection = pendingSelectionRef.current;
    if (!editor || !pendingSelection) return;

    setProfileEmojiEditorSelection(editor, pendingSelection.start, pendingSelection.end);
    editor.focus({ preventScroll: true });
    pendingSelectionRef.current = null;
  }, [inputValue]);

  return (
    <div
      className={classes.blue2Behavior}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <LocalCustomEmojiProvider>
        <FormFieldWrapper
          className={classNames(classes.fieldWrapper, classes.blue2FieldWrapper)}
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
                aria-multiline={inputElement instanceof HTMLTextAreaElement}
                aria-describedby={inputProps['aria-describedby']}
                aria-labelledby={
                  inputElement?.getAttribute('aria-labelledby') ?? undefined
                }
                aria-label={
                  inputElement?.labels?.[0]?.textContent?.trim() ||
                  inputElement?.getAttribute('aria-label') ||
                  undefined
                }
                aria-required={inputProps.required}
                spellCheck
                onInput={handleEditorInput}
                onClick={handleEditorSelection}
                onMouseUp={handleEditorSelection}
                onKeyUp={handleEditorSelection}
                onKeyDown={handleKeyDown}
              >
                {parts.map((part, index) =>
                  part.type === 'emoji' ? (
                    <span
                      key={`emoji-${part.code}-${index}`}
                      data-emoji-shortcode={part.shortcode}
                      contentEditable={false}
                      className={classes.blue2EmojiToken}
                    >
                      <Emoji code={part.shortcode} />
                    </span>
                  ) : (
                    <span key={`text-${index}`}>{part.text}</span>
                  ),
                )}
              </div>
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
          isOpen={!suggestionsHidden && suggestionCodes.length > 0 && inputElement !== null}
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
