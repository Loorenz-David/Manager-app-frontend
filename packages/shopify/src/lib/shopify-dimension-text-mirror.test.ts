import { describe, expect, it } from "vitest";

import type { ShopifyMetafieldField } from "../types";
import {
  findDimensionTextMirrorFields,
  toDimensionTextMirrorValue,
} from "./shopify-dimension-text-mirror";

function field(
  overrides: Partial<ShopifyMetafieldField> & Pick<ShopifyMetafieldField, "identity">,
): ShopifyMetafieldField {
  return {
    shopIntegrationId: "shop-1",
    shopDisplayName: "Shop",
    shopifyMetafieldDefinitionId: overrides.identity,
    name: "Dimensions",
    namespace: "custom",
    key: "dimensions",
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

describe("dimension text mirror", () => {
  const dimension = field({ identity: "dim", type: "dimension" });
  const text = field({ identity: "text" });

  it("finds same-shop plain text dimension fields only", () => {
    expect(
      findDimensionTextMirrorFields(dimension, [
        dimension,
        text,
        text,
        field({ identity: "other-shop", shopIntegrationId: "shop-2" }),
        field({ identity: "color", name: "Color", key: "color" }),
        field({
          identity: "choice",
          validations: [{ name: "choices", value: '["10 cm"]' }],
        }),
      ]).map(({ identity }) => identity),
    ).toEqual(["text"]);
  });

  it("only mirrors from dimension fields", () => {
    expect(findDimensionTextMirrorFields(text, [text])).toEqual([]);
  });

  it("appends cm and clears with the source", () => {
    expect(toDimensionTextMirrorValue("120")).toBe("120 cm");
    expect(toDimensionTextMirrorValue("")).toBe("");
  });
});
