import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const AssignStepWorkerInputSchema = z.object({
  task_id: z.string(),
  step_id: z.string(),
  worker_id: z.string(),
});

export type AssignStepWorkerInput = z.infer<typeof AssignStepWorkerInputSchema>;

const AssignStepWorkerResponseSchema = ApiEnvelopeSchema(
  z.object({ assignment_id: z.string(), worker_id: z.string() }),
).extend({
  ok: z.literal(true),
});

export async function assignStepWorker(input: AssignStepWorkerInput) {
  const { task_id, step_id, ...body } = AssignStepWorkerInputSchema.parse(input);

  return apiClient.post(
    `/api/v1/tasks/${task_id}/steps/${step_id}/assign-worker`,
    AssignStepWorkerResponseSchema,
    body,
  );
}
