import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const AddTaskStepInputSchema = z.object({
  task_id: z.string(),
  working_section_id: z.string(),
  worker_id: z.string().optional(),
});

export type AddTaskStepInput = z.infer<typeof AddTaskStepInputSchema>;

const AddTaskStepResponseSchema = ApiEnvelopeSchema(z.object({ step_id: z.string() })).extend({
  ok: z.literal(true),
});

export async function addTaskStep(input: AddTaskStepInput) {
  const { task_id, ...body } = AddTaskStepInputSchema.parse(input);

  return apiClient.post(`/api/v1/tasks/${task_id}/steps`, AddTaskStepResponseSchema, body);
}
