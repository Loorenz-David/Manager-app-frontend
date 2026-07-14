import type {
  ShopifyMetafieldField,
  ShopifyProductSyncMetafieldValue,
} from "../types";
import { parseMetafieldChoices } from "./parse-metafield-choices";
import { resolveMetafieldInputKind } from "./resolve-shopify-metafield-input";
import { parseShopifyMetafieldTagsValue } from "./shopify-metafield-tags-value";

export function isValidShopifyMetafieldUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isMetafieldValueFilled(
  field: Pick<ShopifyMetafieldField, "type" | "validations">,
  value: string,
): boolean {
  const trimmed = value.trim();
  const kind = resolveMetafieldInputKind(field);
  if (!trimmed || kind === "unsupported") return false;
  if (kind === "url") return isValidShopifyMetafieldUrl(trimmed);
  if (kind === "dimension") return Number.isFinite(Number(trimmed));
  if (kind === "choice") {
    return parseMetafieldChoices(field.validations).includes(value);
  }
  if (kind === "tags") {
    return parseShopifyMetafieldTagsValue(value).length > 0;
  }
  return true;
}

export function toShopifyMetafieldFormValue(
  field: ShopifyMetafieldField,
  value: string,
): ShopifyProductSyncMetafieldValue | null {
  if (!isMetafieldValueFilled(field, value)) return null;
  if (
    field.type !== "single_line_text_field" &&
    field.type !== "url" &&
    field.type !== "dimension" &&
    !field.type.startsWith("list.")
  ) {
    return null;
  }
  return {
    shopIntegrationId: field.shopIntegrationId,
    shopifyMetafieldDefinitionId: field.shopifyMetafieldDefinitionId,
    namespace: field.namespace,
    key: field.key,
    type: field.type,
    value: value.trim(),
  };
}

export function isSubmittableMetafieldEntry(
  entry: ShopifyProductSyncMetafieldValue,
): boolean {
  const trimmed = entry.value.trim();
  if (!trimmed) return false;
  if (entry.type === "url") return isValidShopifyMetafieldUrl(trimmed);
  if (entry.type === "dimension") return Number.isFinite(Number(trimmed));
  if (entry.type.startsWith("list.")) {
    return parseShopifyMetafieldTagsValue(trimmed).length > 0;
  }
  return true;
}

export function toShopifyMetafieldWireValue(
  entry: Pick<ShopifyProductSyncMetafieldValue, "type" | "value">,
): {
  type: string;
  value: string | string[] | { value: number; unit: "CENTIMETERS" };
} {
  if (entry.type.startsWith("list.")) {
    return {
      type: entry.type,
      value: parseShopifyMetafieldTagsValue(entry.value.trim()),
    };
  }

  if (entry.type === "dimension") {
    return {
      type: entry.type,
      value: {
        value: Number(entry.value.trim()),
        unit: "CENTIMETERS",
      },
    };
  }

  return { type: entry.type, value: entry.value.trim() };
}
