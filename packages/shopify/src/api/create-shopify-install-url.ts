import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { ShopifyInstallUrlResponseSchema } from "../types";

const CreateShopifyInstallUrlResponseSchema = ApiEnvelopeSchema(
  ShopifyInstallUrlResponseSchema,
).extend({
  ok: z.literal(true),
});

export type CreateShopifyInstallUrlResult = z.infer<
  typeof CreateShopifyInstallUrlResponseSchema
>["data"];

export async function createShopifyInstallUrl(
  shopDomain: string,
): Promise<CreateShopifyInstallUrlResult> {
  const parsed = await apiClient.post(
    "/api/v1/integrations/shopify/install-url",
    CreateShopifyInstallUrlResponseSchema,
    {
      shop_domain: shopDomain,
      redirect_after_success: null,
    },
  );

  return parsed.data;
}
