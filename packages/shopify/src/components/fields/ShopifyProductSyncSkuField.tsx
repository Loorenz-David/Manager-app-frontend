import { FieldErrorPill, FieldLabelRow, TextInput } from "@beyo/ui";
import { useController, useFormContext } from "react-hook-form";

import type { ShopifyProductSyncFormValues } from "../../types";

export function ShopifyProductSyncSkuField(): React.JSX.Element {
  const { control, setValue } = useFormContext<ShopifyProductSyncFormValues>();
  const { field, fieldState } = useController({
    name: "sku",
    control,
  });
  const inputId = "shopify-product-sync-sku";

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor={inputId} label="SKU">
        <FieldErrorPill
          data-testid="shopify-product-sync-sku-error"
          message={fieldState.error?.message}
        />
      </FieldLabelRow>
      <TextInput
        {...field}
        id={inputId}
        invalid={Boolean(fieldState.error)}
        value={field.value ?? ""}
        onChange={(event) => {
          field.onChange(event);
          setValue("title", event.target.value, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
        data-testid="shopify-product-sync-sku-input"
      />
    </div>
  );
}
