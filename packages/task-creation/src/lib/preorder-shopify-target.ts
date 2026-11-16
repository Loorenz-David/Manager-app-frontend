/**
 * Which shop a pre-order will create a Shopify product in, or `null` when the
 * request carries no `shopify_preorder` section at all.
 *
 * One rule for two readers: `buildShopifyPreorderSection` (what is sent) and
 * `PreOrderFormSchema` (what must be filled in first, e.g. the price the
 * backend requires on every Shopify product). If they disagreed, the form could
 * pass validation and the request still be refused with a 422.
 *
 * Structural input rather than `PreOrderFormValues`: `types.ts` imports this
 * module, so importing the form type back would be a cycle.
 */
export type PreorderShopifyTargetInput = {
  shopIntegrationIds?: string[];
  has_shopify_shops?: boolean;
  shopify_inventory_unavailable_for?: string;
  inventoryQuantities?: Array<{ shopIntegrationId: string }>;
};

export function resolvePreorderShopifyTarget(
  values: PreorderShopifyTargetInput,
): string | null {
  const shopIntegrationId = values.shopIntegrationIds?.[0];

  if (
    !shopIntegrationId ||
    values.has_shopify_shops === false ||
    values.shopify_inventory_unavailable_for === shopIntegrationId
  ) {
    return null;
  }

  const hasInventory = (values.inventoryQuantities ?? []).some(
    (entry) => entry.shopIntegrationId === shopIntegrationId,
  );
  return hasInventory ? shopIntegrationId : null;
}
