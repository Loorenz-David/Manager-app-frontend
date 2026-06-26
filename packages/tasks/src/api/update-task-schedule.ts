import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const UpdateTaskScheduleResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({ ok: z.literal(true) });

export type UpdateTaskScheduleInput = {
  taskId: string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
};

export async function updateTaskSchedule({
  taskId,
  scheduled_start_at,
  scheduled_end_at,
}: UpdateTaskScheduleInput) {
  return apiClient.patch(
    `/api/v1/tasks/${taskId}/schedule`,
    UpdateTaskScheduleResponseSchema,
    { scheduled_start_at, scheduled_end_at },
  );
}
