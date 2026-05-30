import { z } from 'zod';

import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';

import type { CreateCaseInput } from '../types';

const CreateCaseResponseSchema = ApiEnvelopeSchema(
  z.object({ case_client_id: z.string() }),
).extend({ ok: z.literal(true) });

export async function createCase(input: CreateCaseInput): Promise<void> {
  await apiClient.post('/api/v1/cases', CreateCaseResponseSchema, input);
}
