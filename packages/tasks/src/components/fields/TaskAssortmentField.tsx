import { useState } from "react";
import { useController, useFormContext } from "react-hook-form";

import {
  FieldErrorPill,
  FieldLabelRow,
  NumericKeyboardBar,
  TextInput,
} from "@beyo/ui";

export function TaskAssortmentField(): React.JSX.Element {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const error = (errors as { assortment?: { message?: string } }).assortment
    ?.message;
  const { field } = useController({
    name: "assortment",
    control,
  });
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = field.value != null ? String(field.value) : "";

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor="assortment" label="Final Placement">
        <FieldErrorPill data-testid="assortment-error" message={error} />
      </FieldLabelRow>
      <TextInput
        data-testid="assortment-input"
        id="assortment"
        type="text"
        placeholder="e.g. A3"
        invalid={Boolean(error)}
        value={displayValue}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => field.onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
      />
      <NumericKeyboardBar
        hasFocus={isFocused}
        value={displayValue}
        onChange={(next) => field.onChange(next)}
      />
    </div>
  );
}
