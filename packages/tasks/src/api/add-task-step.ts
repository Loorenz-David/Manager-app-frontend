import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const AddTaskStepPayloadSchema = z.object({
  working_section_id: z.string(),
  worker_id: z.string().optional(),
  client_id: z.string().optional(),
  sequence_order: z.number().int().nonnegative().optional(),
});

const AddTaskStepInputSchema = z.object({
  task_id: z.string(),
  steps: z.array(AddTaskStepPayloadSchema).min(1),
});

export type AddTaskStepInput = z.infer<typeof AddTaskStepInputSchema>;

const AddTaskStepResponseSchema = ApiEnvelopeSchema(
  z.object({ step_ids: z.array(z.string()).min(1) }),
).extend({
  ok: z.literal(true),
});

export async function addTaskStep(input: AddTaskStepInput) {
  const { task_id, steps } = AddTaskStepInputSchema.parse(input);

  return apiClient.post(
    `/api/v1/tasks/${task_id}/steps`,
    AddTaskStepResponseSchema,
    steps,
  );
}
