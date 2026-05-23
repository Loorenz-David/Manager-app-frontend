import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const DeleteItemIssueInputSchema = z.object({
  itemId: z.string(),
  issueId: z.string(),
});
export type DeleteItemIssueInput = z.infer<typeof DeleteItemIssueInputSchema>;

const DeleteItemIssueResponseSchema = ApiEnvelopeSchema(z.object({})).extend({
  ok: z.literal(true),
});

export async function deleteItemIssue(input: DeleteItemIssueInput) {
  const { itemId, issueId } = DeleteItemIssueInputSchema.parse(input);
  return apiClient.delete(`/api/v1/items/${itemId}/issues/${issueId}`, DeleteItemIssueResponseSchema);
}
