import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { ShopifyDisconnectResponseSchema } from "../types";

const DisconnectShopifyShopResponseSchema = ApiEnvelopeSchema(
  ShopifyDisconnectResponseSchema,
).extend({
  ok: z.literal(true),
});

export type DisconnectShopifyShopResult = z.infer<
  typeof DisconnectShopifyShopResponseSchema
>["data"];

export async function disconnectShopifyShop(
  shopIntegrationId: string,
): Promise<DisconnectShopifyShopResult> {
  const parsed = await apiClient.delete(
    `/api/v1/integrations/shopify/shops/${shopIntegrationId}`,
    DisconnectShopifyShopResponseSchema,
  );

  return parsed.data;
}
