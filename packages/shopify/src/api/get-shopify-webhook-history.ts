import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import type { GetShopifyWebhookHistoryParams } from "../types";
import { ShopifyWebhookHistoryResponseSchema } from "../types";

const GetShopifyWebhookHistoryResponseSchema = ApiEnvelopeSchema(
  ShopifyWebhookHistoryResponseSchema,
).extend({
  ok: z.literal(true),
});

export type GetShopifyWebhookHistoryResult = z.infer<
  typeof GetShopifyWebhookHistoryResponseSchema
>["data"];

export async function getShopifyWebhookHistory(
  shopIntegrationId: string,
  params: GetShopifyWebhookHistoryParams = {},
): Promise<GetShopifyWebhookHistoryResult> {
  const parsed = await apiClient.get(
    `/api/v1/integrations/shopify/shops/${shopIntegrationId}/webhooks/history`,
    GetShopifyWebhookHistoryResponseSchema,
    params,
  );

  return parsed.data;
}
