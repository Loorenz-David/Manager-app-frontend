import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  UpdateShopifyMetafieldPreferenceSequenceOrderRequestSchema,
  UpdateShopifyMetafieldPreferenceSequenceOrderResponseSchema,
  type UpdateShopifyMetafieldPreferenceSequenceOrderResponse,
} from "../types";

const Envelope = ApiEnvelopeSchema(
  UpdateShopifyMetafieldPreferenceSequenceOrderResponseSchema,
).extend({ ok: z.literal(true) });

export async function updateShopifyMetafieldPreferenceSequenceOrder({
  preferenceClientId,
  sequenceOrder,
}: {
  preferenceClientId: string;
  sequenceOrder: number;
}): Promise<UpdateShopifyMetafieldPreferenceSequenceOrderResponse> {
  const body = UpdateShopifyMetafieldPreferenceSequenceOrderRequestSchema.parse({
    sequence_order: sequenceOrder,
  });
  const parsed = await apiClient.patch(
    `/api/v1/integrations/shopify/metafield-preferences/${preferenceClientId}`,
    Envelope,
    body,
  );
  return parsed.data;
}
