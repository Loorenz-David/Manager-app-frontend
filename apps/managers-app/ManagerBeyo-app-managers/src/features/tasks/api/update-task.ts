import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import type { UpdateTaskInput } from '../types';

const TaskMutationResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({ ok: z.literal(true) });

export async function updateTask(input: UpdateTaskInput) {
  const { id, ...body } = input;
  return apiClient.patch(`/api/v1/tasks/${id}`, TaskMutationResponseSchema, body);
}
