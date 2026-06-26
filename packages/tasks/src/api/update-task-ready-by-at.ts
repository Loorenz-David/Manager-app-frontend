import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const UpdateTaskReadyByAtResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({ ok: z.literal(true) });

export type UpdateTaskReadyByAtInput = {
  taskId: string;
  ready_by_at: string | null;
};

export async function updateTaskReadyByAt({
  taskId,
  ready_by_at,
}: UpdateTaskReadyByAtInput) {
  return apiClient.patch(
    `/api/v1/tasks/${taskId}/ready-by-at`,
    UpdateTaskReadyByAtResponseSchema,
    { ready_by_at },
  );
}
