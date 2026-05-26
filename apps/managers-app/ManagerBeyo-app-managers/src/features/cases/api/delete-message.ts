import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import type { CaseConversationMessageId } from '@/types/common';

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
