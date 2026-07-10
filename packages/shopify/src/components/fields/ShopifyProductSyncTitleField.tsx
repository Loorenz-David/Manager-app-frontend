import { FieldErrorPill, FieldLabelRow, TextInput } from "@beyo/ui";
import { useController, useFormContext } from "react-hook-form";

import type { ShopifyProductSyncFormValues } from "../../types";

export function ShopifyProductSyncTitleField(): React.JSX.Element {
  const { control } = useFormContext<ShopifyProductSyncFormValues>();
  const { field, fieldState } = useController({
    name: "title",
    control,
  });
  const inputId = "shopify-product-sync-title";

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor={inputId} label="Title">
        <FieldErrorPill
          data-testid="shopify-product-sync-title-error"
          message={fieldState.error?.message}
        />
      </FieldLabelRow>
      <TextInput
        {...field}
        id={inputId}
        invalid={Boolean(fieldState.error)}
        value={field.value ?? ""}
        data-testid="shopify-product-sync-title-input"
      />
    </div>
  );
}
