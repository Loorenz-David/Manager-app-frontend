import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { ShopifyInstallUrlResponseSchema } from "../types";

const CreateShopifyReauthorizeUrlResponseSchema = ApiEnvelopeSchema(
  ShopifyInstallUrlResponseSchema,
).extend({
  ok: z.literal(true),
});

export type CreateShopifyReauthorizeUrlResult = z.infer<
  typeof CreateShopifyReauthorizeUrlResponseSchema
>["data"];

export async function createShopifyReauthorizeUrl(
  shopIntegrationId: string,
): Promise<CreateShopifyReauthorizeUrlResult> {
  const parsed = await apiClient.post(
    `/api/v1/integrations/shopify/shops/${shopIntegrationId}/reauthorize-url`,
    CreateShopifyReauthorizeUrlResponseSchema,
    undefined,
  );

  return parsed.data;
}
