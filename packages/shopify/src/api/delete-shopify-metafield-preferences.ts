import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  DeleteShopifyMetafieldPreferencesRequestSchema,
  type DeleteShopifyMetafieldPreferencesRequest,
} from "../types";

const Envelope = ApiEnvelopeSchema(z.record(z.string(), z.unknown())).extend({
  ok: z.literal(true),
});

export async function deleteShopifyMetafieldPreferences(
  clientId: string,
): Promise<void> {
  const body: DeleteShopifyMetafieldPreferencesRequest = {
    client_ids: [clientId],
  };
  await apiClient.delete(
    "/api/v1/integrations/shopify/metafield-preferences",
    Envelope,
    DeleteShopifyMetafieldPreferencesRequestSchema.parse(body),
  );
}
