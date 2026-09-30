import { z } from 'zod';

import { apiClient, type ApiCallOptions } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';

import type { MarkReadInput } from '../types';

const MarkReadResponseSchema = ApiEnvelopeSchema(
  z.object({ last_read_message_seq: z.number().int() }),
).extend({ ok: z.literal(true) });

export async function markRead(
  input: MarkReadInput,
  options?: ApiCallOptions,
): Promise<number> {
  const parsed = await apiClient.post(
    '/api/v1/cases/messages/mark-read',
    MarkReadResponseSchema,
    input,
    options,
  );

  return parsed.data.last_read_message_seq;
}
