import { useCallback, useId, useRef } from 'react';
import type {
  ChangeEvent,
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  FC,
  ReactNode,
  RefObject,
} from 'react';

import type { Merge } from 'type-fest';

import { insertEmojiAtPosition } from '@/mastodon/features/emoji/utils';

import { CharacterCounter } from '../character_counter';
import { EmojiPickerButton } from '../emoji/picker_button';

import {
  Blue2EmojiFieldWrapper,
  isBlue2Theme,
} from './blue2_emoji_field_wrapper';
import classes from './emoji_text_field.module.scss';
import type {
  CommonFieldWrapperProps,
  InputProps,
} from './form_field_wrapper';
import { FormFieldWrapper } from './form_field_wrapper';
import { TextArea } from './text_area_field';
import type { TextAreaProps } from './text_area_field';
import { TextInput } from './text_input_field';

export type EmojiInputProps = {
  value?: string;
  onChange?: (newValue: string) => void;
  counterMax?: number;
  recommended?: boolean;
  blue2EmojiEditor?: boolean;
} & Omit<CommonFieldWrapperProps, 'wrapperClassName'>;

export const EmojiTextInputField: FC<
  Merge<ComponentPropsWithoutRef<'input'>, EmojiInputProps>
> = ({
  onChange,
  value,
  label,
  hint,
  status,
  maxLength,
  counterMax = maxLength,
  recommended,
  disabled,
  blue2EmojiEditor = false,
  ...otherProps
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const wrapperProps = {
    label,
    hint,
    status,
    counterMax,
    recommended,
    maxLength,
    disabled,
    blue2EmojiEditor,
    inputRef,
    value,
    onChange,
  };

  return (
    <EmojiFieldWrapper {...wrapperProps}>
      {(inputProps) => (
        <TextInput
          {...inputProps}
          {...otherProps}
          maxLength={maxLength}
          value={value}
          ref={inputRef}
        />
      )}
    </EmojiFieldWrapper>
  );
};

export const EmojiTextAreaField: FC<
  Merge<Omit<TextAreaProps, 'style'>, EmojiInputProps>
> = ({
  onChange,
  value,
  label,
  maxLength,
  counterMax = maxLength,
  recommended,
  disabled,
  hint,
  status,
  blue2EmojiEditor = false,
  ...otherProps
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapperProps = {
    label,
    hint,
    status,
    counterMax,
    recommended,
    maxLength,
    disabled,
    blue2EmojiEditor,
    inputRef: textareaRef,
    value,
    onChange,
  };

  return (
    <EmojiFieldWrapper {...wrapperProps}>
      {(inputProps) => (
        <TextArea
          {...otherProps}
          {...inputProps}
          maxLength={maxLength}
          value={value}
          ref={textareaRef}
        />
      )}
    </EmojiFieldWrapper>
  );
};

export type EmojiInputElement = HTMLInputElement | HTMLTextAreaElement;

export type EmojiFieldWrapperProps = EmojiInputProps & {
  disabled?: boolean;
  maxLength?: number;
  children: (
    inputProps: InputProps & {
      onChange: ChangeEventHandler<EmojiInputElement>;
    },
  ) => ReactNode;
  inputRef: RefObject<EmojiInputElement | null>;
};

const EmojiFieldWrapper: FC<EmojiFieldWrapperProps> = (props) => {
  if (props.blue2EmojiEditor && isBlue2Theme()) {
    return <Blue2EmojiFieldWrapper {...props} />;
  }

  return <DefaultEmojiFieldWrapper {...props} />;
};

const DefaultEmojiFieldWrapper: FC<EmojiFieldWrapperProps> = ({
  value,
  onChange,
  children,
  disabled,
  inputRef,
  counterMax,
  recommended = false,
  maxLength: _maxLength,
  blue2EmojiEditor: _blue2EmojiEditor,
  ...otherProps
}) => {
  const counterId = useId();

  const handlePickEmoji = useCallback(
    (emoji: string) => {
      if (!value) {
        onChange?.('');
        return;
      }
      const position = inputRef.current?.selectionStart ?? value.length;
      const newValue = insertEmojiAtPosition(value, emoji, position);
      onChange?.(newValue);
    },
    [inputRef, value, onChange],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<EmojiInputElement>) => {
      onChange?.(event.target.value);
    },
    [onChange],
  );

  return (
    <FormFieldWrapper
      className={classes.fieldWrapper}
      describedById={counterId}
      {...otherProps}
    >
      {(inputProps) => (
        <>
          {children({ ...inputProps, onChange: handleChange })}
          <EmojiPickerButton onPick={handlePickEmoji} disabled={disabled} />
          {counterMax && (
            <CharacterCounter
              currentString={value ?? ''}
              maxLength={counterMax}
              recommended={recommended}
              id={counterId}
            />
          )}
        </>
      )}
    </FormFieldWrapper>
  );
};