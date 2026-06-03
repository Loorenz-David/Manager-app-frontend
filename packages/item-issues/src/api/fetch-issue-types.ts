import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ListIssueTypesResponseSchema,
  type ListIssueTypesParams,
  type ListIssueTypesResponse,
} from "../types";

const FetchIssueTypesResponseSchema = ApiEnvelopeSchema(
  ListIssueTypesResponseSchema,
);

export async function fetchIssueTypes(
  params: ListIssueTypesParams = {},
): Promise<ListIssueTypesResponse> {
  const envelope = await apiClient.get(
    "/api/v1/issue-types",
    FetchIssueTypesResponseSchema,
    {
      working_section_id: params.working_section_ids?.length
        ? params.working_section_ids.join(",")
        : undefined,
      item_category_id: params.item_category_ids?.length
        ? params.item_category_ids.join(",")
        : undefined,
      q: params.q,
      limit: params.limit ?? 200,
      offset: params.offset ?? 0,
    },
  );

  return envelope.data;
}
