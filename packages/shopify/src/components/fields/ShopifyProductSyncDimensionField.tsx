import { FieldErrorPill, FieldLabelRow, NumberInput } from "@beyo/ui";
import { useController, useFormContext } from "react-hook-form";

import type { ShopifyProductSyncFormValues } from "../../types";

type ShopifyProductSyncDimensionFieldProps = {
  name: "heightCm" | "widthCm" | "depthCm";
  label: string;
  inputTestId: string;
};

export function ShopifyProductSyncDimensionField({
  name,
  label,
  inputTestId,
}: ShopifyProductSyncDimensionFieldProps): React.JSX.Element {
  const { control } = useFormContext<ShopifyProductSyncFormValues>();
  const { field, fieldState } = useController({
    name,
    control,
  });
  const inputId = `shopify-product-sync-${name.replace("Cm", "")}`;
  const errorTestId = `${inputTestId.replace(/-input$/, "")}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor={inputId} label={label}>
        <FieldErrorPill
          data-testid={errorTestId}
          message={fieldState.error?.message}
        />
      </FieldLabelRow>
      <NumberInput
        id={inputId}
        value={field.value ?? null}
        step={50}
        min={0}
        unitLabel="cm"
        invalid={Boolean(fieldState.error)}
        inputTestId={inputTestId}
        incrementTestId={`${inputTestId}-increment`}
        decrementTestId={`${inputTestId}-decrement`}
        onBlur={field.onBlur}
        onValueChange={(nextValue) => field.onChange(nextValue)}
      />
    </div>
  );
}
