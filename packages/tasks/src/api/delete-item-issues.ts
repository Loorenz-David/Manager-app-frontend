import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const DeleteItemIssuesInputSchema = z.object({
  itemId: z.string(),
  issueIds: z.array(z.string()).min(1),
});
export type DeleteItemIssuesInput = z.infer<typeof DeleteItemIssuesInputSchema>;

const DeleteItemIssuesResponseSchema = ApiEnvelopeSchema(z.object({})).extend({
  ok: z.literal(true),
});

export async function deleteItemIssues(input: DeleteItemIssuesInput) {
  const { itemId, issueIds } = DeleteItemIssuesInputSchema.parse(input);

  return apiClient.delete(
    `/api/v1/items/${itemId}/issues`,
    DeleteItemIssuesResponseSchema,
    { issue_ids: issueIds },
  );
}
