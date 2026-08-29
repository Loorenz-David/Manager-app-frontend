import type { QueryClient } from "@tanstack/react-query";

import { itemCategoryPickerKeys } from "@beyo/item-categories";
import { fromMinorUnits } from "@beyo/item-economics";
import type {
  CreateImageFromUrlBatch,
  CreateImageFromUrlInput,
} from "@beyo/images";
import type { ItemId } from "@beyo/lib";

import type { ItemCategoryPickerOption, ItemLookupResult } from "../types";

type ItemCategoriesPickerCache = {
  itemCategories: ItemCategoryPickerOption[];
};

type PurchasePriceSetValue = (
  name: "item_pricing.purchase_cost_per_piece",
  value: number | null,
  options: { shouldDirty: true },
) => void;

type PurchasePriceForm = {
  setValue: PurchasePriceSetValue;
};

type LookupPropertiesSetValue = (
  name: "item.properties",
  value: Record<string, unknown> | undefined,
  options: { shouldDirty: true },
) => void;

type LookupPropertiesForm = {
  setValue: LookupPropertiesSetValue;
};

export function selectPurchaseApiLookupResult(
  items: ItemLookupResult[],
): ItemLookupResult | null {
  return items.find((item) => item.external_source === "purchase_api") ?? null;
}

export function selectInternalLookupResult(
  items: ItemLookupResult[],
): ItemLookupResult | null {
  return items.find((item) => item.external_source === null) ?? null;
}

export function applyPurchasePriceLookupResult(
  form: PurchasePriceForm,
  selectedItem: Pick<ItemLookupResult, "purchase_price_minor">,
): void {
  const purchasePriceMinor = selectedItem.purchase_price_minor;
  const purchasePrice =
    purchasePriceMinor != null ? fromMinorUnits(purchasePriceMinor) : null;
  const validPurchasePrice =
    purchasePrice != null &&
    Number.isFinite(purchasePrice) &&
    purchasePrice >= 0
      ? purchasePrice
      : null;

  form.setValue(
    "item_pricing.purchase_cost_per_piece",
    validPurchasePrice,
    { shouldDirty: true },
  );
}

export function findCachedItemCategoryOption(
  queryClient: QueryClient,
  itemCategoryId: string | null,
): ItemCategoryPickerOption | null {
  if (!itemCategoryId) {
    return null;
  }

  const cachedLists: Array<ItemCategoriesPickerCache | undefined> = [
    queryClient.getQueryData(itemCategoryPickerKeys.list()),
    queryClient.getQueryData(
      itemCategoryPickerKeys.list({ limit: 200, offset: 0 }),
    ),
  ];

  for (const cachedList of cachedLists) {
    const matchedCategory = cachedList?.itemCategories.find(
      (itemCategory) => itemCategory.client_id === itemCategoryId,
    );

    if (matchedCategory) {
      return matchedCategory;
    }
  }

  return null;
}

export function createLookupResultSignature(
  item: ItemLookupResult | null,
): string | null {
  if (!item) {
    return null;
  }

  return JSON.stringify({
    article_number: item.article_number,
    sku: item.sku,
    item_category_id: item.item_category_id,
    quantity: item.quantity,
    external_id: item.external_id,
    external_source: item.external_source,
    images: item.images,
    purchase_price_minor: item.purchase_price_minor ?? null,
    // Part of the signature so two results that differ only in their
    // properties snapshot are not mistaken for the same applied lookup.
    properties: item.properties ?? null,
  });
}

/**
 * Copies the lookup's properties snapshot onto the form. Absent and empty are
 * both left as `undefined`: the backend treats `null` and `{}` alike as
 * "ingestion had nothing to say" and will not clear an existing snapshot with
 * either, so there is nothing to gain by sending them.
 */
export function applyLookupPropertiesResult(
  form: LookupPropertiesForm,
  selectedItem: Pick<ItemLookupResult, "properties">,
): void {
  const properties = selectedItem.properties;
  const hasProperties = properties != null && Object.keys(properties).length > 0;

  form.setValue("item.properties", hasProperties ? properties : undefined, {
    shouldDirty: true,
  });
}

export function buildCreateImagesFromUrlBatch(
  images: (string | { image_url: string })[],
  itemClientId: string,
): CreateImageFromUrlBatch {
  return images.map(
    (image): CreateImageFromUrlInput => ({
      image_url: typeof image === "string" ? image : image.image_url,
      entity_type: "item",
      entity_client_id: itemClientId as ItemId,
    }),
  );
}
