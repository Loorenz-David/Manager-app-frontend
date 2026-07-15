import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ShopifyLocationsResponseSchema,
  type ShopifyLocationsResponse,
} from "../types";

const Envelope = ApiEnvelopeSchema(ShopifyLocationsResponseSchema).extend({
  ok: z.literal(true),
});

export async function listShopifyLocations(
  shopIntegrationIds: string[],
): Promise<ShopifyLocationsResponse> {
  const parsed = await apiClient.get(
    "/api/v1/integrations/shopify/locations",
    Envelope,
    { shop_integration_ids: shopIntegrationIds.join(",") },
  );
  return parsed.data;
}
