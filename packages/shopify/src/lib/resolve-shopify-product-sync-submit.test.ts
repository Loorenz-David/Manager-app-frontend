import { describe, expect, it } from "vitest";
import {
  isFormFilled,
  resolveShopifyProductSyncSubmit,
} from "./resolve-shopify-product-sync-submit";

const base = {
  shopIntegrationIds: [],
  sku: "",
  heightCm: null,
  widthCm: null,
  depthCm: null,
  title: "",
  description: "",
};

describe("resolveShopifyProductSyncSubmit", () => {
  it("skips empty values even with shops or article number", () =>
    expect(
      resolveShopifyProductSyncSubmit({
        values: { ...base, shopIntegrationIds: ["shop_1"] },
        itemClientId: "itm_1",
        itemArticleNumber: "A-1",
      }).kind,
    ).toBe("skip"));

  it("does not consider zero dimensions filled", () => {
    expect(
      isFormFilled({
        ...base,
        heightCm: 0,
        widthCm: 0,
        depthCm: 0,
      }),
    ).toBe(false);
  });

  it("treats a form with only zero dimensions as skip", () => {
    expect(
      resolveShopifyProductSyncSubmit({
        values: {
          ...base,
          shopIntegrationIds: ["shop_1"],
          heightCm: 0,
          widthCm: 0,
          depthCm: 0,
        },
        itemClientId: "itm_1",
        itemArticleNumber: "A-1",
      }),
    ).toEqual({ kind: "skip" });
  });

  it("requires title fallback and identity for real submits", () => {
    expect(
      resolveShopifyProductSyncSubmit({
        values: { ...base, heightCm: 50 },
        itemClientId: "itm_1",
        itemArticleNumber: null,
      }),
    ).toMatchObject({ kind: "blocked", field: "title" });
    expect(
      resolveShopifyProductSyncSubmit({
        values: { ...base, title: "Chair" },
        itemClientId: "itm_1",
        itemArticleNumber: null,
      }),
    ).toMatchObject({ kind: "blocked", field: "sku" });
  });

  it("treats positive dimensions as filled", () => {
    expect(
      isFormFilled({
        ...base,
        heightCm: 50,
      }),
    ).toBe(true);
  });

  it("does not emit zero dimensions as metafields", () => {
    const result = resolveShopifyProductSyncSubmit({
      values: {
        ...base,
        sku: "SKU-1",
        shopIntegrationIds: ["shop_1"],
        heightCm: 0,
        widthCm: 0,
        depthCm: 0,
      },
      itemClientId: "itm_1",
      itemArticleNumber: "A-1",
    });

    expect(result).toEqual({
      kind: "submit",
      payload: {
        items: [
          {
            client_id: "itm_1",
            target_shop_integration_ids: ["shop_1"],
            title: "SKU-1",
            sku: "SKU-1",
            item_article_number: "A-1",
            metafields: undefined,
          },
        ],
      },
    });
  });

  it("emits positive dimensions under the correct metafield keys", () => {
    const result = resolveShopifyProductSyncSubmit({
      values: {
        ...base,
        sku: "SKU-1",
        shopIntegrationIds: ["shop_1"],
        heightCm: 50,
        widthCm: 100,
        depthCm: 150,
        description: "Desc",
      },
      itemClientId: "itm_1",
      itemArticleNumber: "A-1",
    });

    expect(result).toEqual({
      kind: "submit",
      payload: {
        items: [
          {
            client_id: "itm_1",
            target_shop_integration_ids: ["shop_1"],
            title: "SKU-1",
            description: "Desc",
            sku: "SKU-1",
            item_article_number: "A-1",
            metafields: {
              Height: 50,
              Width: 100,
              Depth: 150,
            },
          },
        ],
      },
    });
  });
});
