import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ShopifyMetafieldPreferencesResponseSchema,
  type GetShopifyMetafieldPreferencesParams,
  type ShopifyMetafieldPreferencesResponse,
} from "../types";

const Envelope = ApiEnvelopeSchema(
  ShopifyMetafieldPreferencesResponseSchema,
).extend({ ok: z.literal(true) });

export async function getShopifyMetafieldPreferences(
  params: GetShopifyMetafieldPreferencesParams,
): Promise<ShopifyMetafieldPreferencesResponse> {
  const query: Record<string, string> = {
    shop_integration_ids: params.shopIntegrationIds.join(","),
  };
  if (params.itemCategoryIds?.length) {
    query.item_category_ids = params.itemCategoryIds.join(",");
  }
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.searchOffset) query.search_offset = String(params.searchOffset);
  if (params.onlyMyPreferences !== undefined) {
    query.only_my_preferences = String(params.onlyMyPreferences);
  }

  const parsed = await apiClient.get(
    "/api/v1/integrations/shopify/metafield-preferences",
    Envelope,
    query,
  );
  return parsed.data;
}
