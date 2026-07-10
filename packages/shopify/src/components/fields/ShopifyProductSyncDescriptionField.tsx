import { FieldErrorPill, FieldLabelRow, TextArea } from "@beyo/ui";
import { useController, useFormContext } from "react-hook-form";

import type { ShopifyProductSyncFormValues } from "../../types";

export function ShopifyProductSyncDescriptionField(): React.JSX.Element {
  const { control } = useFormContext<ShopifyProductSyncFormValues>();
  const { field, fieldState } = useController({
    name: "description",
    control,
  });
  const inputId = "shopify-product-sync-description";

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor={inputId} label="Description">
        <FieldErrorPill
          data-testid="shopify-product-sync-description-error"
          message={fieldState.error?.message}
        />
      </FieldLabelRow>
      <TextArea
        {...field}
        id={inputId}
        invalid={Boolean(fieldState.error)}
        value={field.value ?? ""}
        data-testid="shopify-product-sync-description-input"
        rows={5}
      />
    </div>
  );
}
