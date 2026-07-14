import { describe, expect, it } from "vitest";

import {
  isMetafieldValueFilled,
  isSubmittableMetafieldEntry,
  toShopifyMetafieldFormValue,
  toShopifyMetafieldWireValue,
} from "./shopify-metafield-value";

const dimensionField = {
  type: "dimension",
  validations: [],
} as const;

const listField = {
  type: "list.single_line_text_field",
  validations: [],
} as const;

describe("shopify metafield value helpers", () => {
  it("accepts finite dimension drafts and rejects invalid drafts", () => {
    expect(isMetafieldValueFilled(dimensionField, "120")).toBe(true);
    expect(isMetafieldValueFilled(dimensionField, "")).toBe(false);
    expect(isMetafieldValueFilled(dimensionField, "not-a-number")).toBe(false);
    expect(isMetafieldValueFilled(dimensionField, "Infinity")).toBe(false);
  });

  it("keeps dimension values in the shared form model", () => {
    expect(
      toShopifyMetafieldFormValue(
        {
          identity: "custom.widthcm",
          shopIntegrationId: "shop_1",
          shopDisplayName: "Shop",
          shopifyMetafieldDefinitionId: "definition_1",
          name: "Width",
          namespace: "custom",
          key: "widthcm",
          description: null,
          type: "dimension",
          validations: [],
          source: "search_result",
          sequenceOrder: 0,
          preferenceClientId: null,
          createdBy: null,
        },
        "120",
      ),
    ).toMatchObject({ type: "dimension", value: "120" });
  });

  it("requires a non-empty JSON string array for list metafields", () => {
    expect(isMetafieldValueFilled(listField, "[]")).toBe(false);
    expect(isMetafieldValueFilled(listField, '["red"]')).toBe(true);
    expect(isMetafieldValueFilled(listField, "not-json")).toBe(false);
    expect(
      isSubmittableMetafieldEntry({
        shopIntegrationId: "shop_1",
        shopifyMetafieldDefinitionId: "definition_1",
        namespace: "custom",
        key: "colors",
        type: "list.single_line_text_field",
        value: '["red"]',
      }),
    ).toBe(true);
    expect(
      isSubmittableMetafieldEntry({
        shopIntegrationId: "shop_1",
        shopifyMetafieldDefinitionId: "definition_1",
        namespace: "custom",
        key: "colors",
        type: "list.single_line_text_field",
        value: "[]",
      }),
    ).toBe(false);
  });

  it("keeps list values in the shared form model", () => {
    expect(
      toShopifyMetafieldFormValue(
        {
          identity: "custom.colors",
          shopIntegrationId: "shop_1",
          shopDisplayName: "Shop",
          shopifyMetafieldDefinitionId: "definition_1",
          name: "Colors",
          namespace: "custom",
          key: "colors",
          description: null,
          type: "list.single_line_text_field",
          validations: [],
          source: "search_result",
          sequenceOrder: 0,
          preferenceClientId: null,
          createdBy: null,
        },
        '["red"]',
      ),
    ).toMatchObject({
      type: "list.single_line_text_field",
      value: '["red"]',
    });
  });

  it("builds the wrapped wire value and filters invalid dimension entries", () => {
    expect(
      toShopifyMetafieldWireValue({ type: "dimension", value: " 120 " }),
    ).toEqual({
      type: "dimension",
      value: { value: 120, unit: "CENTIMETERS" },
    });
    expect(
      toShopifyMetafieldWireValue({
        type: "single_line_text_field",
        value: " Wool ",
      }),
    ).toEqual({ type: "single_line_text_field", value: "Wool" });
    expect(
      toShopifyMetafieldWireValue({
        type: "list.single_line_text_field",
        value: '["red", "blue"]',
      }),
    ).toEqual({
      type: "list.single_line_text_field",
      value: ["red", "blue"],
    });
    expect(
      isSubmittableMetafieldEntry({
        shopIntegrationId: "shop_1",
        shopifyMetafieldDefinitionId: "definition_1",
        namespace: "custom",
        key: "widthcm",
        type: "dimension",
        value: "invalid",
      }),
    ).toBe(false);
  });
});
