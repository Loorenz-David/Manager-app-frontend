import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { ShopifySyncWebhooksForShopResponseSchema } from "../types";

const SyncShopifyWebhooksForShopResponseSchema = ApiEnvelopeSchema(
  ShopifySyncWebhooksForShopResponseSchema,
).extend({
  ok: z.literal(true),
});

export type SyncShopifyWebhooksForShopResult = z.infer<
  typeof SyncShopifyWebhooksForShopResponseSchema
>["data"];

export async function syncShopifyWebhooksForShop(
  shopIntegrationId: string,
): Promise<SyncShopifyWebhooksForShopResult> {
  const parsed = await apiClient.post(
    `/api/v1/integrations/shopify/shops/${shopIntegrationId}/webhooks/sync`,
    SyncShopifyWebhooksForShopResponseSchema,
    undefined,
  );

  return parsed.data;
}
