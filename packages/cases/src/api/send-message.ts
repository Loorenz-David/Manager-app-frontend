import { z } from 'zod';

import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';

import {
  CaseConversationMessageRawSchema,
  type CaseConversationMessageRaw,
  type SendMessageInput,
} from '../types';

const SendMessageResponseSchema = ApiEnvelopeSchema(
  z.object({ message: CaseConversationMessageRawSchema }),
).extend({ ok: z.literal(true) });

export async function sendMessage(input: SendMessageInput): Promise<CaseConversationMessageRaw> {
  const { conversation_client_id, ...body } = input;
  const parsed = await apiClient.post(
    `/api/v1/cases/conversations/${conversation_client_id}/messages`,
    SendMessageResponseSchema,
    { ...body, conversation_client_id },
  );

  return parsed.data.message;
}
