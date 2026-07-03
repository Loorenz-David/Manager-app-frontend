import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const TaskMutationResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({ ok: z.literal(true) });

export async function resolveTask(taskId: string): Promise<void> {
  await apiClient.post(
    `/api/v1/tasks/${taskId}/resolve`,
    TaskMutationResponseSchema,
    {},
  );
}
