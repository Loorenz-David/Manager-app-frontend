import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const PostHandlingCountsSchema = z.object({
  pending: z.number().int().optional(),
  filled: z.number().int().optional(),
  completed: z.number().int().optional(),
});

const GetPostHandlingCountsResponseSchema = ApiEnvelopeSchema(
  PostHandlingCountsSchema,
).extend({ ok: z.literal(true) });

export type GetPostHandlingCountsParams = {
  post_handling_states?: string;
};

export type PostHandlingCounts = z.infer<typeof PostHandlingCountsSchema>;

export async function getPostHandlingCounts(
  params: GetPostHandlingCountsParams = {},
): Promise<PostHandlingCounts> {
  const queryParams: Record<string, string> = {};

  if (params.post_handling_states) {
    queryParams.post_handling_states = params.post_handling_states;
  }

  const parsed = await apiClient.get(
    "/api/v1/tasks/post-handling/counts",
    GetPostHandlingCountsResponseSchema,
    queryParams,
  );

  return parsed.data;
}
