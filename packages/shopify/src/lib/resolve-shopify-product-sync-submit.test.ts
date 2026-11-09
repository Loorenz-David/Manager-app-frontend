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
  inventoryQuantities: [],
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

  it("treats a selected zero quantity as an intentional inventory clear", () => {
    expect(
      isFormFilled({
        ...base,
        inventoryQuantities: [
          {
            shopIntegrationId: "shop_1",
            locationId: "gid://shopify/Location/1",
            quantity: 0,
          },
        ],
      }),
    ).toBe(true);
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

  it("routes absolute inventory quantities by shop and preserves zero", () => {
    const result = resolveShopifyProductSyncSubmit({
      values: {
        ...base,
        shopIntegrationIds: ["shop_1", "shop_2"],
        sku: "SKU-1",
        inventoryQuantities: [
          { shopIntegrationId: "shop_1", locationId: "gid://shopify/Location/1", quantity: 3 },
          { shopIntegrationId: "shop_2", locationId: "gid://shopify/Location/2", quantity: 0 },
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
            inventory_quantities: [
              {
                shop_integration_id: "shop_1",
                location_id: "gid://shopify/Location/1",
                quantity: 3,
              },
              {
                shop_integration_id: "shop_2",
                location_id: "gid://shopify/Location/2",
                quantity: 0,
              },
            ],
          },
        ],
      },
    });
  });

  it("links every request item to the ManagerBeyo item", () => {
    const result = resolveShopifyProductSyncSubmit({
      values: { ...base, shopIntegrationIds: ["shop_1"], sku: "SKU-1" },
      itemClientId: "item_1",
      itemArticleNumber: null,
    });

    expect(result).toMatchObject({
      kind: "submit",
      payload: { items: [{ client_id: "item_1", item_client_id: "item_1" }] },
    });
  });

  it("deletes only cleared metafields that existed on the product, per shop", () => {
    const material = {
      shopIntegrationId: "shop_1",
      shopifyMetafieldDefinitionId: "def_material",
      namespace: "custom",
      key: "material",
      type: "single_line_text_field",
      value: "Oak",
    };
    const color = { ...material, shopifyMetafieldDefinitionId: "def_color", key: "color", value: "Red" };
    const result = resolveShopifyProductSyncSubmit({
      values: {
        ...base,
        shopIntegrationIds: ["shop_1"],
        sku: "SKU-1",
        // material kept, color cleared (empty value is not submittable)
        metafields: [material, { ...color, value: "" }],
      },
      itemClientId: "item_1",
      itemArticleNumber: null,
      existingMetafields: [material, color],
    });

    expect(result.kind).toBe("submit");
    if (result.kind !== "submit") return;
    expect(result.payload.items).toHaveLength(1);
    expect(result.payload.items[0].metafields_to_delete).toEqual(["color"]);
    expect(result.payload.items[0].metafields).toEqual({
      material: { type: "single_line_text_field", value: "Oak" },
    });
    expect(ProcessShopifyProductsRequestSchema.safeParse(result.payload).success).toBe(true);
  });

  it("sends a per-shop item when the only change is clearing every metafield", () => {
    const material = {
      shopIntegrationId: "shop_1",
      shopifyMetafieldDefinitionId: "def_material",
      namespace: "custom",
      key: "material",
      type: "single_line_text_field",
      value: "Oak",
    };
    const result = resolveShopifyProductSyncSubmit({
      values: { ...base, shopIntegrationIds: ["shop_1"], sku: "SKU-1", metafields: [] },
      itemClientId: "item_1",
      itemArticleNumber: null,
      existingMetafields: [material],
    });

    expect(result).toMatchObject({
      kind: "submit",
      payload: {
        items: [
          {
            target_shop_integration_ids: ["shop_1"],
            metafields_to_delete: ["material"],
          },
        ],
      },
    });
  });
});
