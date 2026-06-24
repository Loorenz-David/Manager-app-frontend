import type { QueryClient } from "@tanstack/react-query";

import { itemCategoryPickerKeys } from "@beyo/item-categories";
import type {
  CreateImageFromUrlBatch,
  CreateImageFromUrlInput,
} from "@beyo/images";
import type { ItemId } from "@beyo/lib";

import type { ItemCategoryPickerOption, ItemLookupResult } from "../types";

type ItemCategoriesPickerCache = {
  itemCategories: ItemCategoryPickerOption[];
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
