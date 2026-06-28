import { useState } from "react";
import { useController, useFormContext } from "react-hook-form";

import {
  FieldErrorPill,
  FieldLabelRow,
  NumericKeyboardBar,
  TextInput,
} from "@beyo/ui";

export function ItemPositionField(): React.JSX.Element {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const error = (errors as { item?: Record<string, { message?: string }> }).item
    ?.item_position?.message;
  const { field } = useController({
    name: "item.item_position",
    control,
  });
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = field.value != null ? String(field.value) : "";

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor="item-position" label="Position">
        <FieldErrorPill data-testid="item-position-error" message={error} />
      </FieldLabelRow>
      <TextInput
        data-testid="item-position-input"
        id="item-position"
        type="text"
        placeholder="e.g. 3"
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
