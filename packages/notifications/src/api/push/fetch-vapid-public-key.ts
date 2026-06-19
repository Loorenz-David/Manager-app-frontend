import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const VapidPublicKeyResponseSchema = ApiEnvelopeSchema(
  z.object({ public_key: z.string() }),
).extend({ ok: z.literal(true) });

export async function fetchVapidPublicKey(): Promise<string> {
  const response = await apiClient.get(
    "/api/v1/notifications/vapid-public-key",
    VapidPublicKeyResponseSchema,
  );

  return response.data.public_key;
}
