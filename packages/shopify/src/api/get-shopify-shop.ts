import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { ShopifyShopDetailResponseSchema } from "../types";

const GetShopifyShopResponseSchema = ApiEnvelopeSchema(
  ShopifyShopDetailResponseSchema,
).extend({
  ok: z.literal(true),
});

export type GetShopifyShopResult = z.infer<
  typeof GetShopifyShopResponseSchema
>["data"];

export async function getShopifyShop(
  shopIntegrationId: string,
): Promise<GetShopifyShopResult> {
  const parsed = await apiClient.get(
    `/api/v1/integrations/shopify/shops/${shopIntegrationId}`,
    GetShopifyShopResponseSchema,
  );

  return parsed.data;
}
