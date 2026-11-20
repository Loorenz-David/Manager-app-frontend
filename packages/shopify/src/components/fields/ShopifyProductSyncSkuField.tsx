import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { FieldErrorPill, FieldLabelRow, TextInput } from "@beyo/ui";
import { useController, useFormContext } from "react-hook-form";

import { useItemSkuSuggestionQuery } from "../../api/use-item-sku-suggestion-query";
import { useShopifyProductSyncFormContext } from "../../providers/ShopifyProductSyncFormProvider";
import type { ShopifyProductSyncFormValues } from "../../types";

/**
 * When the form opens with no SKU, it is filled with the next house SKU for
 * the item's category (e.g. "T3-201126"). The user can still type over it; a
 * refresh button asks again while the field is empty.
 */
export function ShopifyProductSyncSkuField(): React.JSX.Element {
  const ctx = useShopifyProductSyncFormContext();
  const { control, setValue, getValues } =
    useFormContext<ShopifyProductSyncFormValues>();
  const { field, fieldState } = useController({
    name: "sku",
    control,
  });
  const inputId = "shopify-product-sync-sku";
  const isEmpty = !(field.value ?? "").trim();
  const [suggestOnOpen] = useState(isEmpty);
  const autoFillPending = useRef(suggestOnOpen);
  const suggestion = useItemSkuSuggestionQuery({
    itemCategoryId: ctx.itemCategoryId,
    enabled: suggestOnOpen,
  });

  const applySuggestedSku = useCallback(
    (sku: string) => {
      // Never overwrite something the user typed while the request was out.
      if ((getValues("sku") ?? "").trim()) return;
      setValue("sku", sku, { shouldDirty: true, shouldValidate: true });
      // Title follows the SKU like it does when typing, but a title that is
      // already the product's own (e.g. read back from Shopify) is kept.
      const title = (getValues("title") ?? "").trim();
      if (!title || title === (ctx.defaultTitle ?? "").trim()) {
        setValue("title", sku, { shouldDirty: true, shouldValidate: true });
      }
    },
    [ctx.defaultTitle, getValues, setValue],
  );

  const suggestedSku = suggestion.data?.sku ?? null;
  useEffect(() => {
    if (!autoFillPending.current || !suggestedSku) return;
    autoFillPending.current = false;
    applySuggestedSku(suggestedSku);
  }, [applySuggestedSku, suggestedSku]);

  async function suggestAgain(): Promise<void> {
    autoFillPending.current = false;
    const result = await suggestion.refetch();
    if (result.data?.sku) applySuggestedSku(result.data.sku);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor={inputId} label="SKU">
        <FieldErrorPill
          data-testid="shopify-product-sync-sku-error"
          message={fieldState.error?.message}
        />
        {isEmpty && ctx.itemCategoryId ? (
          <button
            type="button"
            className="inline-flex items-center rounded-full p-1 text-muted-foreground disabled:opacity-50"
            onClick={() => void suggestAgain()}
            disabled={suggestion.isFetching}
            aria-label="Suggest SKU"
            data-testid="shopify-product-sync-sku-suggest"
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-4 ${suggestion.isFetching ? "animate-spin" : ""}`}
            />
          </button>
        ) : null}
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
