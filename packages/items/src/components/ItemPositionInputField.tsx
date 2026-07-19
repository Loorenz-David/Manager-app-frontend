import { useState } from "react";

import { FieldErrorPill, NumericKeyboardBar, TextInput } from "@beyo/ui";

type ItemPositionInputFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  testId?: string;
};

/**
 * Standalone wagon/position input. Mirrors the position tab of
 * `ItemPositionZoneField` but is controlled directly instead of through
 * react-hook-form, so it can be dropped into non-form surfaces.
 */
export function ItemPositionInputField({
  value,
  onChange,
  label = "Wagon",
  error,
  testId = "item-position-input-field",
}: ItemPositionInputFieldProps): React.JSX.Element {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      {label ? (
        <label
          className="text-sm font-medium text-muted-foreground"
          htmlFor="item-position-standalone"
        >
          {label}
        </label>
      ) : null}
      <TextInput
        data-testid={`${testId}-input`}
        id="item-position-standalone"
        invalid={Boolean(error)}
        placeholder="e.g. 3"
        type="text"
        value={value}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
      />
      <NumericKeyboardBar
        hasFocus={isFocused}
        value={value}
        onChange={onChange}
      />
      <FieldErrorPill data-testid={`${testId}-error`} message={error} />
    </div>
  );
}
