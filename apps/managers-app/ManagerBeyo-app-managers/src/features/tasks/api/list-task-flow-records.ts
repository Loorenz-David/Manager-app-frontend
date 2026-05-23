import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import { TaskFlowRecordSchema } from '../types';

const ListTaskFlowRecordsResponseSchema = ApiEnvelopeSchema(
  z.object({
    flow_records: z.array(TaskFlowRecordSchema),
    flow_records_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export type ListTaskFlowRecordsResult = z.infer<typeof ListTaskFlowRecordsResponseSchema>['data'];

export async function listTaskFlowRecords(taskId: string): Promise<ListTaskFlowRecordsResult> {
  const parsed = await apiClient.get(
    `/api/v1/tasks/${taskId}/flow-records`,
    ListTaskFlowRecordsResponseSchema,
  );

  return parsed.data;
}
