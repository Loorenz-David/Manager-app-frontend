import { describe, expect, it } from "vitest";
import {
  isFormFilled,
  resolveShopifyProductSyncSubmit,
} from "./resolve-shopify-product-sync-submit";
import { ProcessShopifyProductsRequestSchema } from "../types";

const base = {
  shopIntegrationIds: [] as string[],
  sku: "",
  metafields: [],
  inventoryAdjustments: [],
  title: "",
  description: "",
};

describe("resolveShopifyProductSyncSubmit", () => {
  it("skips an empty form", () => {
    expect(
      resolveShopifyProductSyncSubmit({
        values: { ...base, shopIntegrationIds: ["shop_1"] },
        itemClientId: "item_1",
        itemArticleNumber: "A-1",
      }),
    ).toEqual({ kind: "skip" });
  });

  it("counts valid dynamic metafields as filled but rejects invalid URLs", () => {
    expect(
      isFormFilled({
        ...base,
        metafields: [
          {
            shopIntegrationId: "shop_1",
            shopifyMetafieldDefinitionId: "definition_1",
            namespace: "custom",
            key: "material",
            type: "single_line_text_field",
            value: "Wool",
          },
        ],
      }),
    ).toBe(true);
    expect(
      isFormFilled({
        ...base,
        metafields: [
          {
            shopIntegrationId: "shop_1",
            shopifyMetafieldDefinitionId: "definition_2",
            namespace: "custom",
            key: "manual",
            type: "url",
            value: "not-a-url",
          },
        ],
      }),
    ).toBe(false);
    expect(
      isFormFilled({
        ...base,
        metafields: [
          {
            shopIntegrationId: "shop_1",
            shopifyMetafieldDefinitionId: "definition_3",
            namespace: "custom",
            key: "widthcm",
            type: "dimension",
            value: "not-a-number",
          },
        ],
      }),
    ).toBe(false);
  });

  it("scopes metafields into one request item per shop", () => {
    const result = resolveShopifyProductSyncSubmit({
      values: {
        ...base,
        shopIntegrationIds: ["shop_1", "shop_2"],
        sku: "SKU-1",
        metafields: [
          {
            shopIntegrationId: "shop_1",
            shopifyMetafieldDefinitionId: "definition_1",
            namespace: "custom",
            key: "material",
            type: "single_line_text_field",
            value: "Wool",
          },
          {
            shopIntegrationId: "shop_2",
            shopifyMetafieldDefinitionId: "definition_2",
            namespace: "custom",
            key: "manual",
            type: "url",
            value: "https://example.com/manual",
          },
        ],
      },
      itemClientId: "item_1",
      itemArticleNumber: "A-1",
      productCategory: "Chair",
    });

    expect(result).toMatchObject({
      kind: "submit",
      payload: {
        items: [
          {
            target_shop_integration_ids: ["shop_1"],
            product_category: "Chair",
            metafields: {
              material: {
                type: "single_line_text_field",
                value: "Wool",
              },
            },
          },
          {
            target_shop_integration_ids: ["shop_2"],
            metafields: {
              manual: {
                type: "url",
                value: "https://example.com/manual",
              },
            },
          },
        ],
      },
    });

    if (result.kind !== "submit") throw new Error("Expected submit result");
    expect(() => ProcessShopifyProductsRequestSchema.parse(result.payload)).not
      .toThrow();
  });

  it("serializes dimension metafields with their type and centimeter value", () => {
    const result = resolveShopifyProductSyncSubmit({
      values: {
        ...base,
        shopIntegrationIds: ["shop_1"],
        sku: "SKU-1",
        metafields: [
          {
            shopIntegrationId: "shop_1",
            shopifyMetafieldDefinitionId: "definition_1",
            namespace: "custom",
            key: "widthcm",
            type: "dimension",
            value: "120",
          },
          {
            shopIntegrationId: "shop_1",
            shopifyMetafieldDefinitionId: "definition_2",
            namespace: "custom",
            key: "invalid-width",
            type: "dimension",
            value: "invalid",
          },
        ],
      },
      itemClientId: "item_1",
      itemArticleNumber: "A-1",
    });

    expect(result).toMatchObject({
      kind: "submit",
      payload: {
        items: [
          {
            metafields: {
              widthcm: {
                type: "dimension",
                value: { value: 120, unit: "CENTIMETERS" },
              },
            },
          },
        ],
      },
    });
  });

  it("serializes list metafields as arrays in the wire payload", () => {
    const result = resolveShopifyProductSyncSubmit({
      values: {
        ...base,
        shopIntegrationIds: ["shop_1"],
        sku: "SKU-1",
        metafields: [
          {
            shopIntegrationId: "shop_1",
            shopifyMetafieldDefinitionId: "definition_1",
            namespace: "custom",
            key: "colors",
            type: "list.single_line_text_field",
            value: '["red","blue"]',
          },
        ],
      },
      itemClientId: "item_1",
      itemArticleNumber: "A-1",
    });

    expect(result).toMatchObject({
      kind: "submit",
      payload: {
        items: [
          {
            metafields: {
              colors: {
                type: "list.single_line_text_field",
                value: ["red", "blue"],
              },
            },
          },
        ],
      },
    });

    if (result.kind !== "submit") throw new Error("Expected submit result");
    expect(() => ProcessShopifyProductsRequestSchema.parse(result.payload)).not
      .toThrow();
  });

  it("routes positive inventory adjustments by shop and drops zero quantities", () => {
    const result = resolveShopifyProductSyncSubmit({
      values: {
        ...base,
        shopIntegrationIds: ["shop_1", "shop_2"],
        sku: "SKU-1",
        inventoryAdjustments: [
          { shopIntegrationId: "shop_1", locationId: "gid://shopify/Location/1", quantityToAdd: 3 },
          { shopIntegrationId: "shop_2", locationId: "gid://shopify/Location/2", quantityToAdd: 0 },
        ],
      },
      itemClientId: "item_1",
      itemArticleNumber: "A-1",
    });

    expect(result).toMatchObject({
      kind: "submit",
      payload: {
        items: [
          {
            target_shop_integration_ids: ["shop_1", "shop_2"],
            inventory_adjustments: [
              {
                shop_integration_id: "shop_1",
                location_id: "gid://shopify/Location/1",
                quantity_to_add: 3,
              },
            ],
          },
        ],
      },
    });
  });
});
