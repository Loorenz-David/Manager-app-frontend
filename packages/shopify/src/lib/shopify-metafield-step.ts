import type { ShopifyMetafieldField } from "../types";

export type ShopifyMetafieldStep = "metafields" | "report";

const CONDITION_WORD = /(^|[^\p{L}\p{N}])condition(?=$|[^\p{L}\p{N}])/iu;

/** Hide the Report naming prefix in labels without changing Shopify identity. */
export function shopifyMetafieldDisplayName(name: string): string {
  return name.replace(/^\s*condition\s*\.\s*/iu, "").trim() || name;
}

export function isReportMetafieldName(name: string): boolean {
  return CONDITION_WORD.test(name);
}

export function belongsToMetafieldStep(
  name: string,
  step: ShopifyMetafieldStep,
): boolean {
  return isReportMetafieldName(name) === (step === "report");
}

/** Convert a drop within one step to the saved shop/category sequence. */
export function fullSequenceOrderForStepDrop(
  allSavedFields: ShopifyMetafieldField[],
  visibleGroup: ShopifyMetafieldField[],
  oldIndex: number,
  newIndex: number,
): number | null {
  const moved = visibleGroup[oldIndex];
  const target = visibleGroup[newIndex];
  if (!moved || !target || !moved.preferenceClientId || !target.preferenceClientId) {
    return null;
  }
  const fullOrder = allSavedFields
    .filter((field) => field.shopIntegrationId === moved.shopIntegrationId)
    .sort((left, right) => left.sequenceOrder - right.sequenceOrder);
  const targetIndex = fullOrder.findIndex(
    (field) => field.identity === target.identity,
  );
  return targetIndex < 0 ? null : fullOrder[targetIndex].sequenceOrder;
}
