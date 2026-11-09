import type {
  ShopifyItemProductResponse,
  ShopifyItemProductShop,
  ShopifyProductSyncFormValues,
  ShopifyProductSyncInventoryQuantity,
  ShopifyProductSyncMetafieldValue,
} from "../types";
import { parseShopifyMetafieldTagsValue } from "./shopify-metafield-tags-value";

/** Product sync reads and writes product metafields in this namespace only. */
export const SHOPIFY_PRODUCT_SYNC_METAFIELD_NAMESPACE = "custom";

const CENTIMETERS_PER_UNIT: Record<string, number> = {
  MILLIMETERS: 0.1,
  CENTIMETERS: 1,
  METERS: 100,
  INCHES: 2.54,
  FEET: 30.48,
  YARDS: 91.44,
};

/** True while any shop's latest save is still queued or being processed. */
export function isShopifyItemProductSyncInFlight(
  data: ShopifyItemProductResponse,
): boolean {
  return data.shops.some(
    (shop) =>
      shop.sync?.status === "pending" || shop.sync?.status === "processing",
  );
}

export function shopsWithShopifyProduct(
  data: ShopifyItemProductResponse,
): ShopifyItemProductShop[] {
  return data.shops.filter((shop) => shop.product !== null);
}

/**
 * Turn a Shopify metafield value back into the form's text value — the
 * reverse of `toShopifyMetafieldWireValue`. Returns null for values the form
 * cannot represent.
 */
export function fromShopifyMetafieldWireValue(
  type: string,
  value: string,
): string | null {
  if (type.startsWith("list.")) {
    // The form stores tags as the same JSON array string Shopify uses.
    return parseShopifyMetafieldTagsValue(value).length ? value : null;
  }
  if (type === "dimension") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        typeof (parsed as { value?: unknown }).value !== "number"
      ) {
        return null;
      }
      const { value: amount, unit } = parsed as {
        value: number;
        unit?: string;
      };
      const factor = CENTIMETERS_PER_UNIT[(unit ?? "CENTIMETERS").toUpperCase()];
      if (factor === undefined) return null;
      return String(Math.round(amount * factor * 100) / 100);
    } catch {
      return null;
    }
  }
  if (type === "single_line_text_field" || type === "url") return value;
  return null;
}

/** Plain text for the form's description field from Shopify's descriptionHtml. */
export function htmlToPlainText(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Form values representing the Shopify product(s) already linked to the item,
 * or null when no shop has a product yet. These become the form's baseline, so
 * an untouched form is "not dirty" and completing the step skips Shopify.
 */
export function mapShopifyItemProductToFormValues(
  data: ShopifyItemProductResponse,
): ShopifyProductSyncFormValues | null {
  const shops = shopsWithShopifyProduct(data);
  const first = shops[0]?.product;
  if (!first) return null;

  const metafields: ShopifyProductSyncMetafieldValue[] = [];
  const inventoryQuantities: ShopifyProductSyncInventoryQuantity[] = [];
  for (const shop of shops) {
    const product = shop.product;
    if (!product) continue;
    for (const metafield of product.metafields) {
      if (!metafield.definition_id || !metafield.type || metafield.value === null) {
        continue;
      }
      const value = fromShopifyMetafieldWireValue(metafield.type, metafield.value);
      if (value === null) continue;
      metafields.push({
        shopIntegrationId: shop.shop_integration_id,
        shopifyMetafieldDefinitionId: metafield.definition_id,
        namespace: SHOPIFY_PRODUCT_SYNC_METAFIELD_NAMESPACE,
        key: metafield.key,
        type: metafield.type,
        value,
      });
    }
    for (const level of product.inventory) {
      inventoryQuantities.push({
        shopIntegrationId: shop.shop_integration_id,
        locationId: level.location_id,
        // Shopify can report negative available stock; the form only sets >= 0.
        quantity: Math.max(0, level.quantity),
      });
    }
  }

  return {
    shopIntegrationIds: shops.map((shop) => shop.shop_integration_id),
    sku: first.sku ?? "",
    metafields,
    inventoryQuantities,
    title: first.title ?? "",
    description: htmlToPlainText(first.description_html),
  };
}
