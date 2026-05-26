import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import { CaseDetailBaseSchema, type CaseDetailBase, type CreateCaseInput } from '../types';

const CreateCaseResponseSchema = ApiEnvelopeSchema(
  z.object({ case: CaseDetailBaseSchema }),
).extend({ ok: z.literal(true) });

export async function createCase(input: CreateCaseInput): Promise<CaseDetailBase> {
  const parsed = await apiClient.post('/api/v1/cases', CreateCaseResponseSchema, input);
  return parsed.data.case;
}
