import type {
  ChangeEvent,
  ClipboardEventHandler,
  FocusEventHandler,
  InputHTMLAttributes,
} from 'react';

export type NumberInputChangeMeta = {
  draft: string;
  sanitizedDraft: string;
  parsedValue: number | null;
  hasParsedValue: boolean;
  isEmpty: boolean;
  isPartial: boolean;
};

export type NumberInputProps = {
  value?: number | null;
  min?: number;
  max?: number;
  step?: number;
  allowDecimal?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  unitLabel?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete'];
  inputTestId?: string;
  incrementTestId?: string;
  decrementTestId?: string;
  onValueChange?: (value: number | null, meta: NumberInputChangeMeta) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onInputChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onPaste?: ClipboardEventHandler<HTMLInputElement>;
};

export type NumberStepperButtonProps = {
  direction: 'increment' | 'decrement';
  disabled?: boolean;
  testId?: string;
  onPress: () => void;
};
