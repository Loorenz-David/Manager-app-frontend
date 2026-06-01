import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  IssueCategoryConfigSchema,
  type ListIssueCategoryConfigsParams,
} from "../types";

const ListIssueCategoryConfigsResponseSchema = ApiEnvelopeSchema(
  z.object({
    issue_category_configs: z.array(IssueCategoryConfigSchema),
    issue_category_configs_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number(),
      offset: z.number(),
    }),
  }),
);

export async function fetchIssueCategoryConfigs(
  params: ListIssueCategoryConfigsParams = {},
) {
  const response = await apiClient.get(
    "/api/v1/issue-category-configs",
    ListIssueCategoryConfigsResponseSchema,
    {
      item_category_id: params.item_category_id,
      limit: params.limit ?? 200,
      offset: params.offset ?? 0,
      q: params.q,
    },
  );

  return { issueConfigs: response.data.issue_category_configs };
}
