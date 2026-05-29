import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  CaseTypeSchema,
  type CaseType,
  type ListCaseTypesParams,
} from "../types";

const ListCaseTypesResponseSchema = ApiEnvelopeSchema(
  z.object({
    case_types: z.array(CaseTypeSchema),
    case_types_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export async function listCaseTypes(
  params: ListCaseTypesParams = {},
): Promise<CaseType[]> {
  const queryParams: Record<string, string | number> = {};

  if (params.limit != null) queryParams.limit = params.limit;
  if (params.offset != null) queryParams.offset = params.offset;
  if (params.q) queryParams.q = params.q;
  if (params.entity_type) queryParams.entity_type = params.entity_type;

  const parsed = await apiClient.get(
    "/api/v1/case-types",
    ListCaseTypesResponseSchema,
    queryParams,
  );

  return parsed.data.case_types;
}
