import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { ShopifyScopeStatusesResponseSchema } from "../types";

const GetShopifyScopeStatusesResponseSchema = ApiEnvelopeSchema(
  ShopifyScopeStatusesResponseSchema,
).extend({
  ok: z.literal(true),
});

export type GetShopifyScopeStatusesResult = z.infer<
  typeof GetShopifyScopeStatusesResponseSchema
>["data"];

export async function getShopifyScopeStatuses(params: {
  shop_integration_id?: string;
}): Promise<GetShopifyScopeStatusesResult> {
  const parsed = await apiClient.get(
    "/api/v1/integrations/shopify/scopes",
    GetShopifyScopeStatusesResponseSchema,
    params,
  );

  return parsed.data;
}
