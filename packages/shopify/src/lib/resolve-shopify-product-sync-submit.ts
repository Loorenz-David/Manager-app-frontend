import type {
  ProcessShopifyProductsRequest,
  ShopifyProductSyncFormValues,
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
      values.description?.trim(),
  );
}

export function resolveShopifyProductSyncSubmit({
  values,
  itemClientId,
  itemArticleNumber,
  productCategory,
}: {
  values: ShopifyProductSyncFormValues;
  itemClientId: string;
  itemArticleNumber: string | null;
  productCategory?: string | null;
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
    title,
    description: values.description?.trim() || undefined,
    product_category: productCategory?.trim() || undefined,
    sku: values.sku?.trim() || undefined,
    item_article_number: itemArticleNumber ?? undefined,
  };
  const hasMetafields = values.metafields.length > 0;
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
        return {
          ...baseItem,
          target_shop_integration_ids: [shopIntegrationId],
          metafields: Object.keys(metafields).length ? metafields : undefined,
        };
      })
    : [
        {
          ...baseItem,
          target_shop_integration_ids: values.shopIntegrationIds,
          metafields: undefined,
        },
      ];

  return {
    kind: "submit",
    payload: {
      items,
    },
  };
}
