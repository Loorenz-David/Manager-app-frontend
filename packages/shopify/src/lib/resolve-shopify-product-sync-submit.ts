import type {
  ProcessShopifyProductsRequest,
  ShopifyProductSyncFormValues,
} from "../types";

export type ResolveShopifyProductSyncSubmitResult =
  | { kind: "skip" }
  | {
      kind: "blocked";
      field: "title" | "sku" | "shopIntegrationIds";
      reason: string;
    }
  | { kind: "submit"; payload: ProcessShopifyProductsRequest };

const hasPositiveDimension = (
  value: number | null | undefined,
): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export function isFormFilled(values: ShopifyProductSyncFormValues): boolean {
  return Boolean(
    values.sku?.trim() ||
      hasPositiveDimension(values.heightCm) ||
      hasPositiveDimension(values.widthCm) ||
      hasPositiveDimension(values.depthCm) ||
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
  const height = hasPositiveDimension(values.heightCm) ? values.heightCm : null;
  const width = hasPositiveDimension(values.widthCm) ? values.widthCm : null;
  const depth = hasPositiveDimension(values.depthCm) ? values.depthCm : null;

  if (height !== null) metafields.Height = height;
  if (width !== null) metafields.Width = width;
  if (depth !== null) metafields.Depth = depth;

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
