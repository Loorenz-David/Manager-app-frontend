import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  CreateItemIssuesResponseSchema,
  type CreateItemIssueInput,
  type CreateItemIssuesResponse,
} from "../types";

const CreateItemIssuesEnvelopeSchema = ApiEnvelopeSchema(
  CreateItemIssuesResponseSchema,
);

export async function createItemIssues(
  itemId: string,
  issues: CreateItemIssueInput[],
): Promise<CreateItemIssuesResponse> {
  const envelope = await apiClient.post(
    `/api/v1/items/${itemId}/issues`,
    CreateItemIssuesEnvelopeSchema,
    { issues },
  );

  return envelope.data;
}
