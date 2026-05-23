import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const TaskMutationResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({ ok: z.literal(true) });

export async function resolveTask(taskId: string) {
  return apiClient.post(`/api/v1/tasks/${taskId}/resolve`, TaskMutationResponseSchema, {});
}
