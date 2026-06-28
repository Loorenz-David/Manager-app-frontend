import { z } from 'zod';

import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';

import type { CreateCaseInput } from '../types';

const CreateCaseResponseDataSchema = z.object({
  case_client_id: z.string(),
  reference_number: z.string().nullable(),
  scalar_id: z.number().int().nullable(),
});

const CreateCaseResponseSchema = ApiEnvelopeSchema(
  CreateCaseResponseDataSchema,
).extend({ ok: z.literal(true) });

export type CreateCaseResponseData = z.infer<typeof CreateCaseResponseDataSchema>;

export async function createCase(
  input: CreateCaseInput,
): Promise<CreateCaseResponseData> {
  const response = await apiClient.post(
    '/api/v1/cases',
    CreateCaseResponseSchema,
    input,
  );

  return response.data;
}
