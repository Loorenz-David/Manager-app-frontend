import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const TaskMutationResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({ ok: z.literal(true) });

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/api/v1/tasks/${taskId}`, TaskMutationResponseSchema);
}
