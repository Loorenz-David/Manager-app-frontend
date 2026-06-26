import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const RemoveTaskStepInputSchema = z.object({
  task_id: z.string(),
  step_id: z.string(),
});

const RemoveTaskStepsBatchInputSchema = z.object({
  task_id: z.string(),
  step_ids: z.array(z.string()).min(1),
});

export type RemoveTaskStepInput = z.infer<typeof RemoveTaskStepInputSchema>;
export type RemoveTaskStepsBatchInput = z.infer<
  typeof RemoveTaskStepsBatchInputSchema
>;

const RemoveTaskStepResponseSchema = ApiEnvelopeSchema(
  z.object({ step_id: z.string() }),
).extend({
  ok: z.literal(true),
});

const RemoveTaskStepsBatchResponseSchema = ApiEnvelopeSchema(
  z.object({ step_ids: z.array(z.string()).min(1) }),
).extend({
  ok: z.literal(true),
});

export async function removeTaskStep(input: RemoveTaskStepInput) {
  const { task_id, step_id } = RemoveTaskStepInputSchema.parse(input);

  return apiClient.delete(
    `/api/v1/tasks/${task_id}/steps/${step_id}`,
    RemoveTaskStepResponseSchema,
  );
}

export async function removeTaskStepsBatch(input: RemoveTaskStepsBatchInput) {
  const { task_id, step_ids } = RemoveTaskStepsBatchInputSchema.parse(input);

  return apiClient.delete(
    `/api/v1/tasks/${task_id}/steps`,
    RemoveTaskStepsBatchResponseSchema,
    step_ids,
  );
}
