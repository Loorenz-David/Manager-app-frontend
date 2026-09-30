import { z } from "zod";
import { apiClient, type ApiCallOptions } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const RegisterPushSubscriptionResponseSchema = ApiEnvelopeSchema(
  z.object({ subscription: z.object({ client_id: z.string() }) }),
).extend({ ok: z.literal(true) });

export type RegisterPushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label?: string;
};

export async function registerPushSubscription(
  input: RegisterPushSubscriptionInput,
  options?: ApiCallOptions,
): Promise<string> {
  const response = await apiClient.post(
    "/api/v1/notifications/push-subscription",
    RegisterPushSubscriptionResponseSchema,
    input,
    options,
  );

  return response.data.subscription.client_id;
}
