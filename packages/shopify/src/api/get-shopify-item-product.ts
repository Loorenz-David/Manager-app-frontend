import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ShopifyItemProductResponseSchema,
  type ShopifyItemProductResponse,
} from "../types";

const Envelope = ApiEnvelopeSchema(ShopifyItemProductResponseSchema).extend({
  ok: z.literal(true),
});

/** The Shopify product linked to a ManagerBeyo item, read live per active shop. */
export async function getShopifyItemProduct(
  itemClientId: string,
): Promise<ShopifyItemProductResponse> {
  const parsed = await apiClient.get(
    `/api/v1/integrations/shopify/products/by-item/${encodeURIComponent(itemClientId)}`,
    Envelope,
  );
  return parsed.data;
}
