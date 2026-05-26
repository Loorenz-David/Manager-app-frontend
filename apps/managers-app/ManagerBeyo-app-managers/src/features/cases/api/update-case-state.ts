import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import { CaseDetailBaseSchema, type CaseDetailBase, type UpdateCaseStateInput } from '../types';

const UpdateCaseStateResponseSchema = ApiEnvelopeSchema(
  z.object({ case: CaseDetailBaseSchema }),
).extend({ ok: z.literal(true) });

export async function updateCaseState(input: UpdateCaseStateInput): Promise<CaseDetailBase> {
  const { case_client_id, ...body } = input;
  const parsed = await apiClient.patch(
    `/api/v1/cases/${case_client_id}/state`,
    UpdateCaseStateResponseSchema,
    { ...body, case_client_id },
  );

  return parsed.data.case;
}
