import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const DeleteItemIssuesEnvelopeSchema = ApiEnvelopeSchema(z.object({}));

export async function deleteItemIssues(
  itemId: string,
  issueIds: string[],
): Promise<void> {
  await apiClient.delete(
    `/api/v1/items/${itemId}/issues`,
    DeleteItemIssuesEnvelopeSchema,
    {
      issues: issueIds.map((item_issue_id) => ({ item_issue_id })),
    },
  );
}
