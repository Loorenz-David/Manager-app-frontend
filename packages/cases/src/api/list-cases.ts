import { z } from 'zod';

import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';

import { CaseListCardRawSchema, type CaseListCardRaw, type ListCasesParams } from '../types';

const ListCasesResponseSchema = ApiEnvelopeSchema(
  z.object({ cases: z.array(CaseListCardRawSchema) }),
).extend({ ok: z.literal(true) });

export async function listCases(params: ListCasesParams): Promise<CaseListCardRaw[]> {
  const queryParams: Record<string, string | number> = {};

  if (params.case_state) queryParams.case_state = params.case_state;
  if (params.state) queryParams.state = params.state;
  if (params.q) queryParams.q = params.q;
  if (params.created_by_id) queryParams.created_by_id = params.created_by_id;
  if (params.entity_type) queryParams.entity_type = params.entity_type;
  if (params.entity_client_id) queryParams.entity_client_id = params.entity_client_id;
  if (params.offset != null) queryParams.offset = params.offset;
  if (params.limit != null) queryParams.limit = params.limit;

  const parsed = await apiClient.get('/api/v1/cases', ListCasesResponseSchema, queryParams);
  return parsed.data.cases;
}
