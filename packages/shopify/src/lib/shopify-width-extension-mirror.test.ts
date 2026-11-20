import { describe, expect, it } from "vitest";

import type { ShopifyMetafieldField } from "../types";
import { findDimensionTextMirrorFields } from "./shopify-dimension-text-mirror";
import {
  composeWidthText,
  resolveWidthExtensionMirrorUpdates,
} from "./shopify-width-extension-mirror";

function field(
  overrides: Partial<ShopifyMetafieldField> & Pick<ShopifyMetafieldField, "identity">,
): ShopifyMetafieldField {
  return {
    shopIntegrationId: "shop-1",
    shopDisplayName: "Shop",
    shopifyMetafieldDefinitionId: overrides.identity,
    name: overrides.identity,
    namespace: "custom",
    key: overrides.identity,
    description: null,
    type: "single_line_text_field",
    validations: [],
    source: "saved_preference",
    sequenceOrder: 0,
    preferenceClientId: null,
    createdBy: null,
    ...overrides,
  };
}

// The live shop's table fields.
const widthDimension = field({ identity: "wd", name: "Width Dimension", key: "width_dimension", type: "dimension" });
const width = field({ identity: "w", name: "Width", key: "totalwidth" });
const extensionDimension = field({ identity: "ed", name: "Extension Dimension", key: "extension_dimension", type: "dimension" });
const extensionQuantity = field({
  identity: "eq",
  name: "Extension Quantity",
  key: "extension_quantity",
  validations: [{ name: "choices", value: '["1","2","3","4","5","6","7","8"]' }],
});
const height = field({ identity: "h", name: "Height", key: "totalheight" });
const candidates = [widthDimension, width, extensionDimension, extensionQuantity, height];

function resolve(
  edited: ShopifyMetafieldField,
  nextValue: string,
  values: Record<string, string>,
) {
  return resolveWidthExtensionMirrorUpdates(
    edited,
    nextValue,
    candidates,
    (f) => values[f.identity] ?? "",
  )?.map(([target, value]) => [target.identity, value]);
}

describe("composeWidthText", () => {
  it("spells out every extension leaf", () => {
    expect(composeWidthText("100", "50", "2")).toBe("100 + 50 + 50 cm");
    expect(composeWidthText("120", "45", "1")).toBe("120 + 45 cm");
  });

  it("falls back to the plain width without a usable extension", () => {
    expect(composeWidthText("100", "", "2")).toBe("100 cm");
    expect(composeWidthText("100", "50", "")).toBe("100 cm");
    expect(composeWidthText("100", "50", "0")).toBe("100 cm");
  });

  it("clears with the width", () => {
    expect(composeWidthText("", "50", "2")).toBe("");
  });
});

describe("resolveWidthExtensionMirrorUpdates", () => {
  it("recomposes Width from whichever input was edited", () => {
    expect(resolve(widthDimension, "100", { ed: "50", eq: "2" })).toEqual([["w", "100 + 50 + 50 cm"]]);
    expect(resolve(extensionQuantity, "3", { wd: "100", ed: "50" })).toEqual([["w", "100 + 50 + 50 + 50 cm"]]);
    expect(resolve(extensionDimension, "40", { wd: "100", eq: "2" })).toEqual([["w", "100 + 40 + 40 cm"]]);
  });

  it("keeps the plain cm mirror when there are no extensions", () => {
    expect(resolve(widthDimension, "100", {})).toEqual([["w", "100 cm"]]);
    expect(resolve(extensionQuantity, "", { wd: "100", ed: "50" })).toEqual([["w", "100 cm"]]);
  });

  it("leaves other fields to the plain mirror", () => {
    expect(resolve(height, "75", {})).toBeUndefined();
  });

  it("writes nothing without a width dimension field in the same shop", () => {
    const otherShop = { ...widthDimension, identity: "wd-2", shopIntegrationId: "shop-2" };
    expect(
      resolveWidthExtensionMirrorUpdates(extensionQuantity, "2", [otherShop, width, extensionDimension], () => "100"),
    ).toEqual([]);
  });

  it("never mirrors the bare extension size into a dimension text field", () => {
    const dimensionText = field({ identity: "dt", name: "Dimensions", key: "dimensions" });
    expect(findDimensionTextMirrorFields(extensionDimension, [dimensionText])).toEqual([]);
  });
});
