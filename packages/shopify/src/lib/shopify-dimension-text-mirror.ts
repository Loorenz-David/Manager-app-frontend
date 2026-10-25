import type { ShopifyMetafieldField } from "../types";
import { resolveMetafieldInputKind } from "./resolve-shopify-metafield-input";

// TEMPORARY workflow fix: the shop keeps legacy plain-text dimension
// metafields next to the typed `dimension` ones. Whatever is typed into a
// dimension input is copied into its text counterpart as "<value> cm".
// Remove this file and its call site in the picker controller once the text
// metafields are retired.

const DIMENSION_WORD = /dimension|mått/i;

// Each measure pairs only with the text field of the same measure, so height
// never overwrites width or depth.
const MEASURES: Array<[measure: string, pattern: RegExp]> = [
  ["height", /height|höjd/i],
  ["width", /width|bredd/i],
  ["depth", /depth|djup/i],
  ["length", /length|längd/i],
  ["diameter", /diameter/i],
];

function measureOf(field: ShopifyMetafieldField): string | null {
  const label = `${field.name} ${field.key}`;
  return MEASURES.find(([, pattern]) => pattern.test(label))?.[0] ?? null;
}

export function findDimensionTextMirrorFields(
  source: ShopifyMetafieldField,
  candidates: ShopifyMetafieldField[],
): ShopifyMetafieldField[] {
  if (source.type !== "dimension") return [];
  const sourceMeasure = measureOf(source);
  const seen = new Set<string>();
  return candidates.filter((field) => {
    if (seen.has(field.identity)) return false;
    seen.add(field.identity);
    if (
      field.shopIntegrationId !== source.shopIntegrationId ||
      resolveMetafieldInputKind(field) !== "text"
    ) {
      return false;
    }
    const measure = measureOf(field);
    if (sourceMeasure) return measure === sourceMeasure;
    return measure === null && DIMENSION_WORD.test(`${field.name} ${field.key}`);
  });
}

export function toDimensionTextMirrorValue(dimensionValue: string): string {
  const trimmed = dimensionValue.trim();
  return trimmed ? `${trimmed} cm` : "";
}
