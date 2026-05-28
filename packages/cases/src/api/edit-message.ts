import { z } from 'zod';

import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';

import {
  CaseConversationMessageRawSchema,
  type CaseConversationMessageRaw,
  type EditMessageInput,
} from '../types';

const EditMessageResponseSchema = ApiEnvelopeSchema(
  z.object({ message: CaseConversationMessageRawSchema }),
).extend({ ok: z.literal(true) });

export async function editMessage(input: EditMessageInput): Promise<CaseConversationMessageRaw> {
  const { message_client_id, ...body } = input;
  const parsed = await apiClient.patch(
    `/api/v1/cases/messages/${message_client_id}`,
    EditMessageResponseSchema,
    { ...body, message_client_id },
  );

  return parsed.data.message;
}
