import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import {
  CaseConversationMessageRawSchema,
  type CaseConversationMessageRaw,
  type ListMessagesParams,
} from '../types';

const ListMessagesResponseSchema = ApiEnvelopeSchema(
  z.object({ messages: z.array(CaseConversationMessageRawSchema) }),
).extend({ ok: z.literal(true) });

export async function listMessages(
  params: ListMessagesParams,
): Promise<CaseConversationMessageRaw[]> {
  const queryParams: Record<string, number> = {};

  if (params.before_seq != null) queryParams.before_seq = params.before_seq;
  if (params.limit != null) queryParams.limit = params.limit;

  const parsed = await apiClient.get(
    `/api/v1/cases/conversations/${params.conversation_client_id}/messages`,
    ListMessagesResponseSchema,
    queryParams,
  );

  return parsed.data.messages;
}
