import { forwardRef } from 'react';

import { cn } from '@beyo/lib';

import { DISABLED_BASE, FOCUS_WITHIN_RING } from '../shared';
import { CountryPrefixSelector } from './CountryPrefixSelector';
import { phoneInputFieldClasses, phoneInputWrapperVariants } from './phone-input.variants';
import type { PhoneInputProps } from './types';

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      displayValue,
      country,
      placeholder = 'Phone number',
      disabled = false,
      invalid = false,
      id,
      className,
      inputClassName,
      autoComplete = 'tel-national',
      inputAriaLabel,
      selectorAriaLabel,
      inputTestId,
      selectorTestId,
      onDisplayValueChange,
      onCountryPress,
      onBlur,
      onFocus,
      onPaste,
    },
    ref,
  ) => (
    <div
      className={cn(
        phoneInputWrapperVariants({ invalid }),
        FOCUS_WITHIN_RING,
        DISABLED_BASE,
        className,
      )}
    >
      <CountryPrefixSelector
        ariaLabel={selectorAriaLabel}
        country={country}
        disabled={disabled}
        invalid={invalid}
        testId={selectorTestId}
        onPress={onCountryPress}
      />
      <div aria-hidden="true" className="h-6 w-px bg-border" />
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        aria-label={inputAriaLabel}
        autoComplete={autoComplete}
        className={cn(phoneInputFieldClasses, inputClassName)}
        data-testid={inputTestId}
        disabled={disabled}
        id={id}
        inputMode="tel"
        placeholder={placeholder}
        type="tel"
        value={displayValue}
        onBlur={onBlur}
        onChange={(event) => onDisplayValueChange(event.target.value, event)}
        onFocus={onFocus}
        onPaste={onPaste}
      />
    </div>
  ),
);

PhoneInput.displayName = 'PhoneInput';
