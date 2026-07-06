import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

export type SyncTargetedInput = {
  entity_type: "task_customer_coordination";
  entity_client_ids?: string[];
  thread_client_ids?: string[];
  max_threads?: number;
};

const SyncTargetedResponseSchema = ApiEnvelopeSchema(
  z.object({
    enqueued: z.boolean(),
    task_client_id: z.string().nullable(),
    connection_client_id: z.string().nullable(),
  }),
).extend({ ok: z.literal(true) });

export async function postSyncTargeted(input: SyncTargetedInput) {
  const parsed = await apiClient.post(
    "/api/v1/email-threads/sync-targeted",
    SyncTargetedResponseSchema,
    input,
  );

  return parsed.data;
}
