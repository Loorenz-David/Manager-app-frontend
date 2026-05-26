import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const GetUnreadCountsResponseSchema = ApiEnvelopeSchema(
  z.object({ case_unread_counts: z.record(z.string(), z.number().int()) }),
).extend({ ok: z.literal(true) });

export async function getUnreadCounts(caseClientIds?: string[]): Promise<Record<string, number>> {
  const queryParams: Record<string, string> = {};

  if (caseClientIds && caseClientIds.length > 0) {
    queryParams.case_client_ids = caseClientIds.join(',');
  }

  const parsed = await apiClient.get(
    '/api/v1/cases/unread-counts',
    GetUnreadCountsResponseSchema,
    queryParams,
  );

  return parsed.data.case_unread_counts;
}
