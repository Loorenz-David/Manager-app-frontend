import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import type { ListShopifyShopsParams } from "../types";
import { ShopifyShopsListResponseSchema } from "../types";

const ListShopifyShopsResponseSchema = ApiEnvelopeSchema(
  ShopifyShopsListResponseSchema,
).extend({
  ok: z.literal(true),
});

export type ListShopifyShopsResult = z.infer<
  typeof ListShopifyShopsResponseSchema
>["data"];

export async function listShopifyShops(
  params: ListShopifyShopsParams = {},
): Promise<ListShopifyShopsResult> {
  const parsed = await apiClient.get(
    "/api/v1/integrations/shopify/shops",
    ListShopifyShopsResponseSchema,
    params,
  );

  return parsed.data;
}
