import type { ShopifyMetafieldField } from "../types";
import { resolveMetafieldInputKind } from "./resolve-shopify-metafield-input";
import {
  findDimensionTextMirrorFields,
  isExtensionMetafield,
  measureOf,
} from "./shopify-dimension-text-mirror";

// TEMPORARY workflow rule for extendable tables: the legacy plain-text Width
// metafield spells out the base width plus every extension leaf, e.g.
// Width Dimension 100, Extension Quantity 2, Extension Dimension 50 →
// "100 + 50 + 50 cm". Remove this file and its call site in the picker
// controller together with shopify-dimension-text-mirror.ts.

const QUANTITY_WORD = /quantity|antal/i;

export function isWidthDimensionField(field: ShopifyMetafieldField): boolean {
  return (
    field.type === "dimension" &&
    !isExtensionMetafield(field) &&
    measureOf(field) === "width"
  );
}

export function isExtensionDimensionField(field: ShopifyMetafieldField): boolean {
  return field.type === "dimension" && isExtensionMetafield(field);
}

export function isExtensionQuantityField(field: ShopifyMetafieldField): boolean {
  const kind = resolveMetafieldInputKind(field);
  return (
    (kind === "text" || kind === "choice") &&
    isExtensionMetafield(field) &&
    QUANTITY_WORD.test(`${field.name} ${field.key}`)
  );
}

export function composeWidthText(
  width: string,
  extension: string,
  quantity: string,
): string {
  const base = width.trim();
  if (!base) return "";
  const leaf = extension.trim();
  const count = Number(quantity.trim());
  if (!leaf || !Number.isInteger(count) || count <= 0) return `${base} cm`;
  return `${[base, ...Array<string>(count).fill(leaf)].join(" + ")} cm`;
}

/**
 * Width text updates caused by editing one of the three inputs (width
 * dimension, extension dimension, extension quantity). Returns null when the
 * edited field is none of them, so the caller keeps its plain mirror.
 */
export function resolveWidthExtensionMirrorUpdates(
  edited: ShopifyMetafieldField,
  nextValue: string,
  candidates: ShopifyMetafieldField[],
  valueOf: (field: ShopifyMetafieldField) => string,
): Array<[ShopifyMetafieldField, string]> | null {
  if (
    !isWidthDimensionField(edited) &&
    !isExtensionDimensionField(edited) &&
    !isExtensionQuantityField(edited)
  ) {
    return null;
  }
  const sameShop = candidates.filter(
    (field) => field.shopIntegrationId === edited.shopIntegrationId,
  );
  const pick = (matches: (field: ShopifyMetafieldField) => boolean) =>
    matches(edited) ? edited : sameShop.find(matches);
  const currentValue = (field: ShopifyMetafieldField | undefined) => {
    if (!field) return "";
    return field.identity === edited.identity ? nextValue : valueOf(field);
  };

  const widthField = pick(isWidthDimensionField);
  if (!widthField) return [];
  const composed = composeWidthText(
    currentValue(widthField),
    currentValue(pick(isExtensionDimensionField)),
    currentValue(pick(isExtensionQuantityField)),
  );
  return findDimensionTextMirrorFields(widthField, candidates).map(
    (target): [ShopifyMetafieldField, string] => [target, composed],
  );
}
