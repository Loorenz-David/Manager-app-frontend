import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import { TaskDetailRawSchema } from '../types';

const GetTaskResponseSchema = ApiEnvelopeSchema(TaskDetailRawSchema).extend({ ok: z.literal(true) });

export type GetTaskResult = z.infer<typeof GetTaskResponseSchema>['data'];

export async function getTask(taskId: string): Promise<GetTaskResult> {
  const parsed = await apiClient.get(`/api/v1/tasks/${taskId}`, GetTaskResponseSchema);
  return parsed.data;
}
