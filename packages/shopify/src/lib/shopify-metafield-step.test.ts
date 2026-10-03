import { describe, expect, it } from "vitest";
import type { ShopifyMetafieldField } from "../types";
import {
  belongsToMetafieldStep,
  fullSequenceOrderForStepDrop,
  isReportMetafieldName,
} from "./shopify-metafield-step";

function savedField(name: string, sequenceOrder: number, shopIntegrationId = "shop-1"): ShopifyMetafieldField {
  return {
    identity: `${shopIntegrationId}:${name}`,
    shopIntegrationId,
    shopDisplayName: shopIntegrationId,
    shopifyMetafieldDefinitionId: name,
    name,
    namespace: "custom",
    key: name.toLowerCase(),
    description: null,
    type: "single_line_text_field",
    validations: [],
    source: "saved_preference",
    sequenceOrder,
    preferenceClientId: `${shopIntegrationId}:${name}`,
    createdBy: null,
  };
}

describe("Shopify metafield steps", () => {
  it("routes only whole-word condition names to Report", () => {
    for (const name of ["Condition", "Item condition", "item_condition", "condition-report", "CONDITION: grade"]) {
      expect(isReportMetafieldName(name)).toBe(true);
      expect(belongsToMetafieldStep(name, "report")).toBe(true);
      expect(belongsToMetafieldStep(name, "metafields")).toBe(false);
    }
    for (const name of ["Reconditioning", "conditioner", "precondition", "Item status"]) {
      expect(isReportMetafieldName(name)).toBe(false);
      expect(belongsToMetafieldStep(name, "metafields")).toBe(true);
    }
  });

  it("maps a filtered drag to the full shop sequence", () => {
    const first = savedField("First condition", 0);
    const ordinary = savedField("Material", 1);
    const second = savedField("Second condition", 2);
    const otherShop = savedField("Other condition", 0, "shop-2");
    const all = [first, ordinary, second, otherShop];
    expect(fullSequenceOrderForStepDrop(all, [first, second], 1, 0)).toBe(0);
    expect(fullSequenceOrderForStepDrop(all, [first, second], 0, 1)).toBe(2);
    expect(fullSequenceOrderForStepDrop(all, [first, second], 0, 2)).toBeNull();
  });
});
