import { useController, useFormContext } from "react-hook-form";

import { FieldErrorPill, FieldLabelRow, NumberInput } from "@beyo/ui";

export function ItemQuantityField(): React.JSX.Element {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const { field } = useController({
    name: "item.quantity",
    control,
  });
  const error = (
    errors as { item?: Record<string, { message?: string }> }
  ).item?.quantity?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor="item-quantity" label="Quantity">
        <FieldErrorPill data-testid="item-quantity-error" message={error} />
      </FieldLabelRow>
      <NumberInput
        id="item-quantity"
        inputTestId="item-quantity-input"
        incrementTestId="item-quantity-increment-button"
        decrementTestId="item-quantity-decrement-button"
        min={0}
        placeholder="e.g. 1"
        step={1}
        invalid={Boolean(error)}
        value={field.value ?? null}
        onBlur={field.onBlur}
        onValueChange={(nextValue) => field.onChange(nextValue ?? undefined)}
      />
    </div>
  );
}
