import { describe, expect, it } from "vitest";

import {
  fromShopifyMetafieldWireValue,
  htmlToPlainText,
  isShopifyItemProductSyncInFlight,
  mapShopifyItemProductToFormValues,
} from "./map-shopify-item-product-to-form-values";
import type { ShopifyItemProductResponse, ShopifyItemProductShop } from "../types";

function shop(overrides: Partial<ShopifyItemProductShop> = {}): ShopifyItemProductShop {
  return {
    shop_integration_id: "shop_1",
    shop_domain: "one.myshopify.com",
    sync: null,
    product: null,
    fetch_error: null,
    ...overrides,
  };
}

const product = {
  shopify_product_id: "gid://shopify/Product/1",
  title: "Oak chair",
  description_html: "<p>Solid oak.</p><p>Handmade &amp; sturdy</p>",
  status: "ACTIVE",
  sku: "SKU-1",
  barcode: "ART-1",
  metafields: [
    { key: "material", type: "single_line_text_field", value: "Oak", definition_id: "def_material" },
    { key: "widthcm", type: "dimension", value: '{"value":45.0,"unit":"CENTIMETERS"}', definition_id: "def_width" },
    { key: "colors", type: "list.single_line_text_field", value: '["red","blue"]', definition_id: "def_colors" },
    { key: "orphan", type: "single_line_text_field", value: "x", definition_id: null },
    { key: "rating", type: "rating", value: '{"value":"4"}', definition_id: "def_rating" },
  ],
  inventory: [
    { location_id: "gid://shopify/Location/1", quantity: 0 },
    { location_id: "gid://shopify/Location/2", quantity: -2 },
  ],
};

describe("mapShopifyItemProductToFormValues", () => {
  it("returns null when no shop has a product", () => {
    const data: ShopifyItemProductResponse = { item_client_id: "item_1", shops: [shop()] };
    expect(mapShopifyItemProductToFormValues(data)).toBeNull();
  });

  it("maps the existing product into form values", () => {
    const data: ShopifyItemProductResponse = {
      item_client_id: "item_1",
      shops: [shop({ product }), shop({ shop_integration_id: "shop_2", shop_domain: "two.myshopify.com" })],
    };

    expect(mapShopifyItemProductToFormValues(data)).toEqual({
      shopIntegrationIds: ["shop_1"],
      sku: "SKU-1",
      title: "Oak chair",
      description: "Solid oak.\nHandmade & sturdy",
      metafields: [
        { shopIntegrationId: "shop_1", shopifyMetafieldDefinitionId: "def_material", namespace: "custom", key: "material", type: "single_line_text_field", value: "Oak" },
        { shopIntegrationId: "shop_1", shopifyMetafieldDefinitionId: "def_width", namespace: "custom", key: "widthcm", type: "dimension", value: "45" },
        { shopIntegrationId: "shop_1", shopifyMetafieldDefinitionId: "def_colors", namespace: "custom", key: "colors", type: "list.single_line_text_field", value: '["red","blue"]' },
      ],
      // Every stocked location is kept (zero included) so the inventory field
      // does not auto-add remembered locations; negatives clamp to 0.
      inventoryQuantities: [
        { shopIntegrationId: "shop_1", locationId: "gid://shopify/Location/1", quantity: 0 },
        { shopIntegrationId: "shop_1", locationId: "gid://shopify/Location/2", quantity: 0 },
      ],
    });
  });
});

describe("fromShopifyMetafieldWireValue", () => {
  it("converts dimensions to centimetres", () => {
    expect(fromShopifyMetafieldWireValue("dimension", '{"value":12,"unit":"INCHES"}')).toBe("30.48");
    expect(fromShopifyMetafieldWireValue("dimension", '{"value":450,"unit":"MILLIMETERS"}')).toBe("45");
    expect(fromShopifyMetafieldWireValue("dimension", "not json")).toBeNull();
  });

  it("keeps list JSON and rejects unsupported types", () => {
    expect(fromShopifyMetafieldWireValue("list.single_line_text_field", "[]")).toBeNull();
    expect(fromShopifyMetafieldWireValue("url", "https://x.test")).toBe("https://x.test");
    expect(fromShopifyMetafieldWireValue("rating", "4")).toBeNull();
  });
});

describe("htmlToPlainText", () => {
  it("handles empty input and line breaks", () => {
    expect(htmlToPlainText(null)).toBe("");
    expect(htmlToPlainText("a<br>b")).toBe("a\nb");
  });
});

describe("isShopifyItemProductSyncInFlight", () => {
  it("is true while any shop's latest save is pending or processing", () => {
    const sync = (status: "pending" | "processing" | "succeeded" | "failed") => ({
      sync_item_client_id: "s",
      status,
      error_code: null,
      error_message: null,
      updated_at: null,
    });
    expect(isShopifyItemProductSyncInFlight({ item_client_id: "i", shops: [shop({ sync: sync("processing") })] })).toBe(true);
    expect(isShopifyItemProductSyncInFlight({ item_client_id: "i", shops: [shop({ sync: sync("pending") })] })).toBe(true);
    expect(isShopifyItemProductSyncInFlight({ item_client_id: "i", shops: [shop({ sync: sync("failed") }), shop()] })).toBe(false);
  });
});
