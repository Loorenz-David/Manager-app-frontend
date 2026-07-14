export function parseShopifyMetafieldTagsValue(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function stringifyShopifyMetafieldTagsValue(tags: string[]): string {
  return JSON.stringify(tags);
}
