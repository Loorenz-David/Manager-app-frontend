import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const UnregisterPushSubscriptionResponseSchema = ApiEnvelopeSchema(
  z.object({}),
).extend({ ok: z.literal(true) });

export type UnregisterPushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function unregisterPushSubscription(
  input: UnregisterPushSubscriptionInput,
): Promise<void> {
  await apiClient.delete(
    "/api/v1/notifications/push-subscription",
    UnregisterPushSubscriptionResponseSchema,
    input,
  );
}
