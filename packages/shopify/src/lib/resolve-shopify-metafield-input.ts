import type { ShopifyMetafieldField } from "../types";
import { parseMetafieldChoices } from "./parse-metafield-choices";

export type ShopifyMetafieldInputKind =
  | "choice"
  | "text"
  | "url"
  | "dimension"
  | "tags"
  | "unsupported";

export function resolveMetafieldInputKind(
  definition: Pick<ShopifyMetafieldField, "type" | "validations">,
): ShopifyMetafieldInputKind {
  if (definition.type.startsWith("list.")) return "tags";
  if (definition.type === "url") return "url";
  if (definition.type === "dimension") return "dimension";
  if (definition.type !== "single_line_text_field") return "unsupported";
  return parseMetafieldChoices(definition.validations).length
    ? "choice"
    : "text";
}
