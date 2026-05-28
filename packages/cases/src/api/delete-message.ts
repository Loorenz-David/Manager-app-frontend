import { z } from 'zod';

import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';
import type { CaseConversationMessageId } from '@beyo/lib';

const DeleteMessageResponseSchema = ApiEnvelopeSchema(
  z.object({ deleted: z.boolean() }),
).extend({ ok: z.literal(true) });

export async function deleteMessage(messageClientId: CaseConversationMessageId): Promise<boolean> {
  const parsed = await apiClient.delete(
    `/api/v1/cases/messages/${messageClientId}`,
    DeleteMessageResponseSchema,
  );

  return parsed.data.deleted;
}
