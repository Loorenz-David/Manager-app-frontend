import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ListItemIssuesResponseSchema,
  type ListItemIssuesParams,
  type ListItemIssuesResponse,
} from "../types";

const FetchItemIssuesResponseSchema = ApiEnvelopeSchema(
  ListItemIssuesResponseSchema,
);

export async function fetchItemIssues(
  itemId: string,
  params: ListItemIssuesParams = {},
): Promise<ListItemIssuesResponse> {
  const envelope = await apiClient.get(
    `/api/v1/items/${itemId}/issues`,
    FetchItemIssuesResponseSchema,
    {
      working_section_id: params.working_section_id,
      item_category_id: params.item_category_id,
      issue_type_id: params.issue_type_id,
      q: params.q,
      limit: params.limit ?? 200,
      offset: params.offset ?? 0,
    },
  );

  return envelope.data;
}
