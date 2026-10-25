import type { ShopifyMetafieldField } from "../types";
import { resolveMetafieldInputKind } from "./resolve-shopify-metafield-input";

// TEMPORARY workflow fix: the shop keeps a legacy plain-text "dimensions"
// metafield next to the typed `dimension` one. Whatever is typed into the
// dimension input is copied into the text one as "<value> cm".
// Remove this file and its call site in the picker controller once the text
// metafield is retired.

const DIMENSION_WORD = /dimension/i;

export function findDimensionTextMirrorFields(
  source: ShopifyMetafieldField,
  candidates: ShopifyMetafieldField[],
): ShopifyMetafieldField[] {
  if (source.type !== "dimension") return [];
  const seen = new Set<string>();
  return candidates.filter((field) => {
    if (seen.has(field.identity)) return false;
    seen.add(field.identity);
    return (
      field.shopIntegrationId === source.shopIntegrationId &&
      resolveMetafieldInputKind(field) === "text" &&
      DIMENSION_WORD.test(`${field.name} ${field.key}`)
    );
  });
}

export function toDimensionTextMirrorValue(dimensionValue: string): string {
  const trimmed = dimensionValue.trim();
  return trimmed ? `${trimmed} cm` : "";
}
