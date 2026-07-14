import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  CreateShopifyMetafieldPreferencesRequestSchema,
  ShopifyMetafieldPreferenceSchema,
  type CreateShopifyMetafieldPreferencesRequest,
  type ShopifyMetafieldPreference,
} from "../types";

const Envelope = ApiEnvelopeSchema(
  z.array(ShopifyMetafieldPreferenceSchema),
).extend({ ok: z.literal(true) });

export async function createShopifyMetafieldPreferences(
  input: CreateShopifyMetafieldPreferencesRequest,
): Promise<ShopifyMetafieldPreference[]> {
  const parsed = await apiClient.post(
    "/api/v1/integrations/shopify/metafield-preferences",
    Envelope,
    CreateShopifyMetafieldPreferencesRequestSchema.parse(input),
  );
  return parsed.data;
}
