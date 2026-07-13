import type {
  ProcessShopifyProductsRequest,
  ShopifyProductSyncFormValues,
} from "../types";
import {
  hasPositiveShopifyProductSyncDimension,
  SHOPIFY_PRODUCT_SYNC_DIMENSION_FIELDS,
} from "./shopify-product-sync-dimensions";

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
      SHOPIFY_PRODUCT_SYNC_DIMENSION_FIELDS.some(({ name }) =>
        hasPositiveShopifyProductSyncDimension(values[name]),
      ) ||
      values.title?.trim() ||
      values.description?.trim(),
  );
}

export function resolveShopifyProductSyncSubmit({
  values,
  itemClientId,
  itemArticleNumber,
}: {
  values: ShopifyProductSyncFormValues;
  itemClientId: string;
  itemArticleNumber: string | null;
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

  const metafields: Record<string, number> = {};

  for (const { name, metafieldKey } of SHOPIFY_PRODUCT_SYNC_DIMENSION_FIELDS) {
    const value = values[name];

    if (hasPositiveShopifyProductSyncDimension(value)) {
      metafields[metafieldKey] = value;
    }
  }

  return {
    kind: "submit",
    payload: {
      items: [
        {
          client_id: itemClientId,
          target_shop_integration_ids: values.shopIntegrationIds,
          title,
          description: values.description?.trim() || undefined,
          sku: values.sku?.trim() || undefined,
          item_article_number: itemArticleNumber ?? undefined,
          metafields: Object.keys(metafields).length ? metafields : undefined,
        },
      ],
    },
  };
}
