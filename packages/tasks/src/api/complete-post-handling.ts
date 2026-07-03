import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const CompletePostHandlingResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({ ok: z.literal(true) });

export type CompletePostHandlingInput = {
  taskId: string;
  post_handling_id?: string | null;
  force?: boolean;
};

export async function completePostHandling({
  taskId,
  post_handling_id,
  force = false,
}: CompletePostHandlingInput) {
  return apiClient.post(
    `/api/v1/tasks/${taskId}/post-handling/complete`,
    CompletePostHandlingResponseSchema,
    {
      ...(post_handling_id ? { post_handling_id } : {}),
      force,
    },
  );
}
