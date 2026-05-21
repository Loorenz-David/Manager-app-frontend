import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import { clampNumber } from '@/lib/number/clamp-number';
import { formatNumberDisplay } from '@/lib/number/format-number-display';
import { parseNumberDraft } from '@/lib/number/parse-number-draft';
import { sanitizeNumberInput } from '@/lib/number/sanitize-number-input';
import { stepNumber } from '@/lib/number/step-number';
import { cn } from '@/lib/utils';

import { FOCUS_WITHIN_RING, INVALID_RING } from '../shared';
import {
  numberInputFieldClasses,
  numberInputUnitClasses,
  numberInputWrapperVariants,
} from './number-input.variants';
import { NumberStepperButton } from './NumberStepperButton';
import type { NumberInputChangeMeta, NumberInputProps } from './types';

const INTERNAL_VALUE_UNSET = Symbol('internal_number_value_unset');

function toNullableNumber(value: number | null | undefined): number | null {
  return value ?? null;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      min,
      max,
      step = 1,
      allowDecimal = false,
      disabled = false,
      invalid = false,
      id,
      className,
      inputClassName,
      placeholder = 'Enter value',
      unitLabel,
      inputMode,
      autoComplete = 'off',
      inputTestId,
      incrementTestId,
      decrementTestId,
      onValueChange,
      onBlur,
      onFocus,
      onInputChange,
      onPaste,
    },
    ref,
  ) => {
    const externalValue = toNullableNumber(value);
    const [draft, setDraft] = useState(() => formatNumberDisplay(externalValue));
    const lastEmittedValueRef = useRef<number | null | typeof INTERNAL_VALUE_UNSET>(
      INTERNAL_VALUE_UNSET,
    );

    useEffect(() => {
      if (
        lastEmittedValueRef.current !== INTERNAL_VALUE_UNSET &&
        Object.is(lastEmittedValueRef.current, externalValue)
      ) {
        return;
      }

      setDraft(formatNumberDisplay(externalValue));
    }, [externalValue]);

    const draftMeta = useMemo(
      () => parseNumberDraft(draft, { allowDecimal }),
      [allowDecimal, draft],
    );

    function emitValue(nextValue: number | null, nextMeta: NumberInputChangeMeta): void {
      lastEmittedValueRef.current = nextValue;
      onValueChange?.(nextValue, nextMeta);
    }

    function handleDraftChange(nextRawValue: string): void {
      const sanitizedDraft = sanitizeNumberInput(nextRawValue, { allowDecimal });
      const nextMeta = parseNumberDraft(sanitizedDraft, { allowDecimal });

      setDraft(nextMeta.sanitizedDraft);

      if (nextMeta.isEmpty) {
        emitValue(null, nextMeta);
        return;
      }

      emitValue(nextMeta.hasParsedValue ? nextMeta.parsedValue : null, nextMeta);
    }

    function normalizeDraft(): void {
      if (draftMeta.isEmpty) {
        setDraft('');
        emitValue(null, draftMeta);
        return;
      }

      if (!draftMeta.hasParsedValue || draftMeta.parsedValue === null) {
        setDraft('');
        emitValue(null, {
          ...draftMeta,
          sanitizedDraft: '',
          parsedValue: null,
          hasParsedValue: false,
          isEmpty: true,
          isPartial: false,
        });
        return;
      }

      const normalizedValue = clampNumber(draftMeta.parsedValue, min, max);
      const normalizedDraft = formatNumberDisplay(normalizedValue);
      const normalizedMeta = parseNumberDraft(normalizedDraft, { allowDecimal });

      setDraft(normalizedDraft);
      emitValue(normalizedValue, normalizedMeta);
    }

    function handleStep(direction: 1 | -1): void {
      const baseValue = draftMeta.hasParsedValue ? draftMeta.parsedValue : externalValue;
      const nextValue = stepNumber({
        value: baseValue,
        direction,
        step,
        min,
        max,
      });
      const nextDraft = formatNumberDisplay(nextValue);
      const nextMeta = parseNumberDraft(nextDraft, { allowDecimal });

      setDraft(nextDraft);
      emitValue(nextValue, nextMeta);
    }

    const currentValue = draftMeta.hasParsedValue ? draftMeta.parsedValue : externalValue;
    const decrementTarget = stepNumber({
      value: currentValue,
      direction: -1,
      step,
      min,
      max,
    });
    const incrementTarget = stepNumber({
      value: currentValue,
      direction: 1,
      step,
      min,
      max,
    });
    const decrementDisabled =
      disabled ||
      (currentValue !== null && Object.is(decrementTarget, clampNumber(currentValue, min, max))) ||
      (currentValue === null &&
        min !== undefined &&
        min !== null &&
        Object.is(decrementTarget, min));
    const incrementDisabled =
      disabled ||
      (currentValue !== null && Object.is(incrementTarget, clampNumber(currentValue, min, max)));

    return (
      <div
        className={cn(
          numberInputWrapperVariants({ invalid }),
          FOCUS_WITHIN_RING,
          disabled && 'cursor-not-allowed opacity-50',
          invalid && INVALID_RING,
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 px-3">
          <input
            ref={ref}
            aria-invalid={invalid || undefined}
            autoComplete={autoComplete}
            className={cn(numberInputFieldClasses, inputClassName)}
            data-testid={inputTestId}
            disabled={disabled}
            id={id}
            inputMode={inputMode ?? (allowDecimal ? 'decimal' : 'numeric')}
            pattern={allowDecimal ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
            placeholder={placeholder}
            type="text"
            value={draft}
            onBlur={(event) => {
              normalizeDraft();
              onBlur?.(event);
            }}
            onChange={(event) => {
              handleDraftChange(event.target.value);
              onInputChange?.(event);
            }}
            onFocus={onFocus}
            onPaste={onPaste}
          />
          {unitLabel ? (
            <span
              aria-hidden="true"
              className={cn(numberInputUnitClasses, draft.length === 0 && 'opacity-70')}
            >
              {unitLabel}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 px-3">
          <NumberStepperButton
            direction="decrement"
            disabled={decrementDisabled}
            testId={decrementTestId}
            onPress={() => handleStep(-1)}
          />
          <NumberStepperButton
            direction="increment"
            disabled={incrementDisabled}
            testId={incrementTestId}
            onPress={() => handleStep(1)}
          />
        </div>
      </div>
    );
  },
);

NumberInput.displayName = 'NumberInput';
