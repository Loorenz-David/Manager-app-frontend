import type {
  ProcessShopifyProductsRequest,
  ShopifyProductSyncFormValues,
  ShopifyProductSyncMetafieldValue,
} from "../types";
import {
  isSubmittableMetafieldEntry,
  toShopifyMetafieldWireValue,
} from "./shopify-metafield-value";

export type ResolveShopifyProductSyncSubmitResult =
  | { kind: "skip" }
  | {
      kind: "blocked";
      field: "title" | "sku" | "shopIntegrationIds";
      reason: string;
    }
  | { kind: "submit"; payload: ProcessShopifyProductsRequest };

export function isFormFilled(values: ShopifyProductSyncFormValues): boolean {
  return Boolean(
    values.sku?.trim() ||
      values.metafields.some(
        isSubmittableMetafieldEntry,
      ) ||
      values.title?.trim() ||
      values.description?.trim() ||
      (values.inventoryQuantities ?? []).length > 0,
  );
}

/**
 * Keys present on the existing Shopify product (the form's prefilled
 * baseline) that the worker has cleared, for one shop. Only baseline entries
 * are candidates, so metafields the form never showed are never deleted.
 */
export function resolveClearedMetafieldKeys(
  values: ShopifyProductSyncFormValues,
  existingMetafields: ShopifyProductSyncMetafieldValue[],
  shopIntegrationId: string,
): string[] {
  const keptKeys = new Set(
    values.metafields
      .filter(
        (entry) =>
          entry.shopIntegrationId === shopIntegrationId &&
          isSubmittableMetafieldEntry(entry),
      )
      .map((entry) => entry.key),
  );
  return Array.from(
    new Set(
      existingMetafields
        .filter(
          (entry) =>
            entry.shopIntegrationId === shopIntegrationId &&
            !keptKeys.has(entry.key),
        )
        .map((entry) => entry.key),
    ),
  );
}

export function resolveShopifyProductSyncSubmit({
  values,
  itemClientId,
  itemArticleNumber,
  productCategory,
  existingMetafields = [],
}: {
  values: ShopifyProductSyncFormValues;
  itemClientId: string;
  itemArticleNumber: string | null;
  productCategory?: string | null;
  /** Metafields prefilled from the existing Shopify product, if any. */
  existingMetafields?: ShopifyProductSyncMetafieldValue[];
}): ResolveShopifyProductSyncSubmitResult {
  if (!isFormFilled(values)) return { kind: "skip" };

  const title = values.title?.trim() || values.sku?.trim() || itemArticleNumber || null;

  if (!title) {
    return {
      kind: "blocked",
      field: "title",
      reason:
        "Enter a product title, or provide a SKU that can be used as the title.",
    };
  }

  const identity = values.sku?.trim() || itemArticleNumber || null;

  if (!identity) {
    return {
      kind: "blocked",
      field: "sku",
      reason: "Enter a SKU so Shopify can identify this product.",
    };
  }

  if (!values.shopIntegrationIds.length) {
    return {
      kind: "blocked",
      field: "shopIntegrationIds",
      reason: "Select at least one Shopify shop to sync to.",
    };
  }

  const baseItem = {
    client_id: itemClientId,
    item_client_id: itemClientId,
    title,
    description: values.description?.trim() || undefined,
    product_category: productCategory?.trim() || undefined,
    sku: values.sku?.trim() || undefined,
    item_article_number: itemArticleNumber ?? undefined,
  };
  function inventoryQuantitiesForShop(shopIntegrationId?: string) {
    const quantities = (values.inventoryQuantities ?? [])
      .filter(
        (entry) =>
          (shopIntegrationId === undefined || entry.shopIntegrationId === shopIntegrationId),
      )
      .map((entry) => ({
        shop_integration_id: entry.shopIntegrationId,
        location_id: entry.locationId,
        quantity: entry.quantity,
      }));
    return quantities.length ? quantities : undefined;
  }
  const clearedKeysByShop = new Map(
    values.shopIntegrationIds.map((shopIntegrationId) => [
      shopIntegrationId,
      resolveClearedMetafieldKeys(values, existingMetafields, shopIntegrationId),
    ]),
  );
  const hasClearedMetafields = Array.from(clearedKeysByShop.values()).some(
    (keys) => keys.length > 0,
  );
  const hasMetafields = values.metafields.length > 0 || hasClearedMetafields;
  const items = hasMetafields
    ? values.shopIntegrationIds.map((shopIntegrationId) => {
        const metafields = Object.fromEntries(
          values.metafields
            .filter(
              (entry) =>
                entry.shopIntegrationId === shopIntegrationId &&
                isSubmittableMetafieldEntry(entry),
            )
            .map((entry) => [entry.key, toShopifyMetafieldWireValue(entry)]),
        );
        const clearedKeys = clearedKeysByShop.get(shopIntegrationId) ?? [];
        return {
          ...baseItem,
          target_shop_integration_ids: [shopIntegrationId],
          metafields: Object.keys(metafields).length ? metafields : undefined,
          metafields_to_delete: clearedKeys.length ? clearedKeys : undefined,
          inventory_quantities: inventoryQuantitiesForShop(shopIntegrationId),
        };
      })
    : [
        {
          ...baseItem,
          target_shop_integration_ids: values.shopIntegrationIds,
          metafields: undefined,
          inventory_quantities: inventoryQuantitiesForShop(),
        },
      ];

  return {
    kind: "submit",
    payload: {
      items,
    },
  };
}
