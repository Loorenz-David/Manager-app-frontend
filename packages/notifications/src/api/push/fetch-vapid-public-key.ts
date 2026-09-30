import { z } from "zod";
import { apiClient, type ApiCallOptions } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const VapidPublicKeyResponseSchema = ApiEnvelopeSchema(
  z.object({ public_key: z.string() }),
).extend({ ok: z.literal(true) });

export async function fetchVapidPublicKey(
  options?: ApiCallOptions,
): Promise<string> {
  const response = await apiClient.get(
    "/api/v1/notifications/vapid-public-key",
    VapidPublicKeyResponseSchema,
    undefined,
    options,
  );

  return response.data.public_key;
}
