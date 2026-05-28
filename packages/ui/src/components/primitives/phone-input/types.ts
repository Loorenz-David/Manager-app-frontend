import type {
  ChangeEvent,
  ClipboardEvent,
  FocusEventHandler,
  InputHTMLAttributes,
} from 'react';

import type { CountryIso2, PhoneCountry } from '@beyo/lib';

export type PhoneInputProps = {
  displayValue: string;
  country: PhoneCountry | null;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  inputClassName?: string;
  autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete'];
  inputAriaLabel?: string;
  selectorAriaLabel?: string;
  inputTestId?: string;
  selectorTestId?: string;
  onDisplayValueChange: (
    next: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onCountryPress: () => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
};

export type CountryPrefixSelectorProps = {
  country: PhoneCountry | null;
  disabled?: boolean;
  invalid?: boolean;
  ariaLabel?: string;
  testId?: string;
  onPress: () => void;
};

export type PhoneCountryPickerSurfaceProps = {
  currentCountryIso2?: CountryIso2 | null;
  onSelect?: (countryIso2: CountryIso2) => void;
};
