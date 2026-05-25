import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const RemoveTaskStepInputSchema = z.object({
  task_id: z.string(),
  step_id: z.string(),
});

export type RemoveTaskStepInput = z.infer<typeof RemoveTaskStepInputSchema>;

const RemoveTaskStepResponseSchema = ApiEnvelopeSchema(z.object({ step_id: z.string() })).extend({
  ok: z.literal(true),
});

export async function removeTaskStep(input: RemoveTaskStepInput) {
  const { task_id, step_id } = RemoveTaskStepInputSchema.parse(input);

  return apiClient.delete(`/api/v1/tasks/${task_id}/steps/${step_id}`, RemoveTaskStepResponseSchema);
}
