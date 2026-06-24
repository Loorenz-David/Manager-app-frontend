import { useEffect, useMemo, useRef, useState } from "react";

import {
  getPhoneCountryByIso2,
  readLastPhoneCountryIso2,
  resolveInitialPhoneState,
  resolvePhoneChange,
  writeLastPhoneCountryIso2,
  type CountryIso2,
  type ManagedPhoneInputChangeMeta,
} from "@beyo/lib";
import { usePreloadSurface } from "@beyo/hooks";
import { PhoneInput, useSurfaceStore } from "@beyo/ui";

import { PHONE_COUNTRY_PICKER_SURFACE_ID, preloadPhoneCountryPickerSurface } from "../surfaces";

type ManagedPhoneInputProps = {
  value?: string;
  countryIso2?: CountryIso2;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  inputClassName?: string;
  autoComplete?: string;
  inputTestId?: string;
  selectorTestId?: string;
  onValueChange?: (value: string, meta: ManagedPhoneInputChangeMeta) => void;
  onCountryChange?: (countryIso2: CountryIso2) => void;
};

const INTERNAL_VALUE_UNSET = "__internal_value_unset__";

export function ManagedPhoneInput({
  value,
  countryIso2,
  placeholder,
  disabled = false,
  invalid = false,
  id,
  className,
  inputClassName,
  autoComplete,
  inputTestId,
  selectorTestId,
  onValueChange,
  onCountryChange,
}: ManagedPhoneInputProps): React.JSX.Element {
  const persistedCountryIso2 = useMemo(() => readLastPhoneCountryIso2(), []);
  const initialState = useMemo(
    () =>
      resolveInitialPhoneState({
        value,
        controlledCountryIso2: countryIso2,
        persistedCountryIso2,
      }),
    [countryIso2, persistedCountryIso2, value],
  );

  const [selectedCountryIso2, setSelectedCountryIso2] = useState<CountryIso2 | null>(
    initialState.countryIso2,
  );
  const [displayValue, setDisplayValue] = useState(initialState.displayValue);
  const lastEmittedValueRef = useRef<string>(INTERNAL_VALUE_UNSET);

  usePreloadSurface(preloadPhoneCountryPickerSurface);

  useEffect(() => {
    if ((value ?? "") === lastEmittedValueRef.current && countryIso2 === undefined) {
      return;
    }

    const nextState = resolveInitialPhoneState({
      value,
      controlledCountryIso2: countryIso2,
      persistedCountryIso2,
    });

    setSelectedCountryIso2(nextState.countryIso2);
    setDisplayValue(nextState.displayValue);
  }, [countryIso2, persistedCountryIso2, value]);

  const selectedCountry = getPhoneCountryByIso2(selectedCountryIso2);

  function emitChange(rawValue: string, nextCountryIso2: CountryIso2 | null): void {
    const nextMeta = resolvePhoneChange(rawValue, nextCountryIso2);
    const emittedValue = nextMeta.normalizedValue;

    if (nextMeta.countryIso2 && nextMeta.countryIso2 !== nextCountryIso2) {
      setSelectedCountryIso2(nextMeta.countryIso2);
    }

    lastEmittedValueRef.current = emittedValue;
    onValueChange?.(emittedValue, nextMeta);
  }

  function handleCountrySelect(nextCountryIso2: CountryIso2): void {
    setSelectedCountryIso2(nextCountryIso2);
    writeLastPhoneCountryIso2(nextCountryIso2);
    onCountryChange?.(nextCountryIso2);
    emitChange(displayValue, nextCountryIso2);
  }

  function openCountryPicker(): void {
    useSurfaceStore.getState().open(PHONE_COUNTRY_PICKER_SURFACE_ID, {
      currentCountryIso2: selectedCountryIso2,
      onSelect: handleCountrySelect,
    });
  }

  return (
    <PhoneInput
      autoComplete={autoComplete}
      className={className}
      country={selectedCountry}
      disabled={disabled}
      displayValue={displayValue}
      id={id}
      inputClassName={inputClassName}
      inputTestId={inputTestId}
      invalid={invalid}
      placeholder={placeholder}
      selectorTestId={selectorTestId}
      onCountryPress={openCountryPicker}
      onDisplayValueChange={(nextRawValue) => {
        const nextMeta = resolvePhoneChange(nextRawValue, selectedCountryIso2);
        setDisplayValue(nextMeta.displayValue);

        if (nextMeta.countryIso2 && nextMeta.countryIso2 !== selectedCountryIso2) {
          setSelectedCountryIso2(nextMeta.countryIso2);
        }

        lastEmittedValueRef.current = nextMeta.normalizedValue;
        onValueChange?.(nextMeta.normalizedValue, nextMeta);
      }}
      onFocus={() => {
        void preloadPhoneCountryPickerSurface();
      }}
    />
  );
}
