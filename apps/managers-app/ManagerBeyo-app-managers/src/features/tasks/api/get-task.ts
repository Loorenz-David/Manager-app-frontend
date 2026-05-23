import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const GetTaskResponseSchema = ApiEnvelopeSchema(
  z.object({
    task: z.record(z.string(), z.unknown()),
    item: z.record(z.string(), z.unknown()).nullable(),
    item_images: z.array(z.record(z.string(), z.unknown())),
    item_issues: z.array(z.record(z.string(), z.unknown())),
    item_upholstery: z.array(z.record(z.string(), z.unknown())),
    requirements: z.array(z.record(z.string(), z.unknown())),
    task_steps: z.array(z.record(z.string(), z.unknown())),
    task_notes: z.array(z.record(z.string(), z.unknown())),
    unread_message_count: z.number().int(),
  }),
).extend({ ok: z.literal(true) });

export type GetTaskResult = z.infer<typeof GetTaskResponseSchema>['data'];

export async function getTask(taskId: string): Promise<GetTaskResult> {
  const parsed = await apiClient.get(`/api/v1/tasks/${taskId}`, GetTaskResponseSchema);
  return parsed.data;
}
