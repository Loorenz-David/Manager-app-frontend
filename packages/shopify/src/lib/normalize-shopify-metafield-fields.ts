import type {
  ShopifyMetafieldField,
  ShopifyMetafieldPreferencesResponse,
  ShopifyShopIntegration,
} from "../types";
import { createMetafieldFieldIdentity } from "./shopify-metafield-identity";

function displayName(
  shopIntegrationId: string,
  shopDomain: string,
  integrations: ShopifyShopIntegration[],
): string {
  const integration = integrations.find(
    ({ client_id }) => client_id === shopIntegrationId,
  );
  return (
    integration?.shop_name?.trim() ||
    integration?.shop_domain.replace(/\.myshopify\.com$/i, "") ||
    shopDomain.replace(/\.myshopify\.com$/i, "")
  );
}

export function mergeShopifyMetafieldPreferencePages(
  pages: ShopifyMetafieldPreferencesResponse[] | undefined,
): ShopifyMetafieldPreferencesResponse | undefined {
  if (!pages || pages.length === 0) return undefined;
  const shopsById = new Map<
    string,
    ShopifyMetafieldPreferencesResponse["shops"][number]
  >();
  pages.forEach((page) => {
    page.shops.forEach((shop) => {
      const existing = shopsById.get(shop.shop_integration_id);
      if (!existing) {
        shopsById.set(shop.shop_integration_id, shop);
        return;
      }
      const seenIds = new Set(
        existing.search_results.map(
          (definition) => definition.shopify_metafield_definition_id,
        ),
      );
      shopsById.set(shop.shop_integration_id, {
        ...shop,
        search_results: [
          ...existing.search_results,
          ...shop.search_results.filter(
            (definition) =>
              !seenIds.has(definition.shopify_metafield_definition_id),
          ),
        ],
      });
    });
  });
  return { shops: Array.from(shopsById.values()) };
}

export function normalizeShopifyMetafieldFields(
  response: ShopifyMetafieldPreferencesResponse | undefined,
  integrations: ShopifyShopIntegration[],
  source: "saved_preference" | "search_result",
  itemCategoryId?: string | null,
): ShopifyMetafieldField[] {
  if (!response) return [];
  return response.shops.flatMap((shop) => {
    const definitions =
      source === "search_result"
        ? shop.search_results.map((definition, sequenceOrder) => ({
            ...definition,
            sequenceOrder,
            preferenceClientId: null,
            createdBy: null,
          }))
        : shop.item_categories
            .filter(
              (category) =>
                !itemCategoryId ||
                category.item_category_id === itemCategoryId,
            )
            .flatMap((category) =>
            category.metafield_preferences.map((preference) => ({
              ...preference,
              sequenceOrder: preference.sequence_order,
              preferenceClientId: preference.client_id,
              createdBy: preference.created_by,
            })),
          );

    return definitions
      .map((definition) => ({
        identity: createMetafieldFieldIdentity(
          shop.shop_integration_id,
          definition.shopify_metafield_definition_id,
        ),
        shopIntegrationId: shop.shop_integration_id,
        shopDisplayName: displayName(
          shop.shop_integration_id,
          shop.shop_domain,
          integrations,
        ),
        shopifyMetafieldDefinitionId:
          definition.shopify_metafield_definition_id,
        name: definition.name,
        namespace: definition.namespace,
        key: definition.key,
        description: definition.description,
        type: definition.type,
        validations: definition.validations,
        source,
        sequenceOrder: definition.sequenceOrder,
        preferenceClientId: definition.preferenceClientId,
        createdBy: definition.createdBy,
      }))
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  });
}

export function normalizeUnavailableMetafieldDefinitions(
  response: ShopifyMetafieldPreferencesResponse | undefined,
  integrations: ShopifyShopIntegration[],
): Array<{ shopIntegrationId: string; shopDisplayName: string; definitionId: string }> {
  if (!response) return [];
  return response.shops.flatMap((shop) =>
    shop.unavailable_definition_ids.map((definitionId) => ({
      shopIntegrationId: shop.shop_integration_id,
      shopDisplayName: displayName(
        shop.shop_integration_id,
        shop.shop_domain,
        integrations,
      ),
      definitionId,
    })),
  );
}
