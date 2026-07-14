import type { ShopifyMetafieldValidation } from "../types";

export function parseMetafieldChoices(
  validations: ShopifyMetafieldValidation[],
): string[] {
  const validation = validations.find(({ name }) => name === "choices");
  if (!validation) return [];
  try {
    const parsed: unknown = JSON.parse(validation.value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}
