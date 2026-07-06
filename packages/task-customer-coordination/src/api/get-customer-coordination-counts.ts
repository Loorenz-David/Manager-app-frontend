import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { CustomerCoordinationCountsSchema } from "../types";

const GetCustomerCoordinationCountsResponseSchema = ApiEnvelopeSchema(
  CustomerCoordinationCountsSchema,
).extend({ ok: z.literal(true) });

export type GetCustomerCoordinationCountsParams = {
  customer_coordination_states?: string;
};

export async function getCustomerCoordinationCounts(
  params: GetCustomerCoordinationCountsParams = {},
) {
  const queryParams: Record<string, string> = {};

  if (params.customer_coordination_states) {
    queryParams.customer_coordination_states =
      params.customer_coordination_states;
  }

  const parsed = await apiClient.get(
    "/api/v1/tasks/customer-coordination/counts",
    GetCustomerCoordinationCountsResponseSchema,
    queryParams,
  );

  return parsed.data;
}
