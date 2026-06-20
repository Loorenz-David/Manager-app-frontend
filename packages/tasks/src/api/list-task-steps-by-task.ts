import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { TaskStepForPinSchema } from "../types";

const ListTaskStepsByTaskResponseSchema = ApiEnvelopeSchema(
  z.object({
    steps_pagination: z.object({
      items: z.array(TaskStepForPinSchema),
      has_more: z.boolean(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export type TaskStepForPin = z.infer<typeof TaskStepForPinSchema>;

export async function listTaskStepsByTask(
  taskId: string,
): Promise<TaskStepForPin[]> {
  const envelope = await apiClient.get(
    `/api/v1/tasks/${taskId}/steps`,
    ListTaskStepsByTaskResponseSchema,
  );

  return envelope.data.steps_pagination.items;
}
