import type { ItemLookupResult } from "@beyo/items";

export function selectQuickLookupResult(
  items: ItemLookupResult[],
): ItemLookupResult | null {
  return (
    items.find((item) => item.external_source === "purchase_api") ??
    items[0] ??
    null
  );
}

export function createQuickLookupSignature(
  item: ItemLookupResult | null,
): string | null {
  return item
    ? JSON.stringify({
        article_number: item.article_number,
        quantity: item.quantity,
        external_id: item.external_id,
        external_source: item.external_source,
      })
    : null;
}
