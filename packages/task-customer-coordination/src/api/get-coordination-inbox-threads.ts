import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { mapCoordinationInboxThread } from "../lib/map-coordination-inbox-thread";
import {
  CoordinationInboxThreadRawSchema,
  type CoordinationInboxThreadsParams,
  type CoordinationInboxThreadsResult,
} from "../types";

const GetCoordinationInboxThreadsResponseSchema = ApiEnvelopeSchema(
  z.object({
    coordination_threads: z.array(CoordinationInboxThreadRawSchema),
    coordination_threads_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export async function getCoordinationInboxThreads(
  params: CoordinationInboxThreadsParams = {},
): Promise<CoordinationInboxThreadsResult> {
  const queryParams: Record<string, string | number> = {};

  if (params.coordination_states) queryParams.coordination_states = params.coordination_states;
  if (params.q) queryParams.q = params.q;
  if (params.limit != null) queryParams.limit = params.limit;
  if (params.offset != null) queryParams.offset = params.offset;

  const parsed = await apiClient.get(
    "/api/v1/tasks/customer-coordination/threads",
    GetCoordinationInboxThreadsResponseSchema,
    queryParams,
  );

  return {
    items: parsed.data.coordination_threads.map(mapCoordinationInboxThread),
    ...parsed.data.coordination_threads_pagination,
  };
}
