import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { ItemIssueSchema, type ItemIssue } from "../types";

const FetchItemIssuesResponseSchema = ApiEnvelopeSchema(
  z.object({
    item_issues: z.array(ItemIssueSchema),
  }),
);

export async function fetchItemIssues(
  itemId: string,
): Promise<{ issues: ItemIssue[] }> {
  const envelope = await apiClient.get(
    `/api/v1/items/${itemId}/issues`,
    FetchItemIssuesResponseSchema,
  );

  return { issues: envelope.data.item_issues };
}
