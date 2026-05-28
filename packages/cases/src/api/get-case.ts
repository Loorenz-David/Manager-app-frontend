import { z } from 'zod';

import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';
import type { CaseId } from '@beyo/lib';

import { CaseDetailRawSchema, type CaseDetailRaw } from '../types';

const GetCaseResponseSchema = ApiEnvelopeSchema(CaseDetailRawSchema).extend({
  ok: z.literal(true),
});

export type GetCaseParams = {
  case_client_id: CaseId;
  before_message_seq?: number;
  messages_limit?: number;
};

export async function getCase(params: GetCaseParams): Promise<CaseDetailRaw> {
  const queryParams: Record<string, number> = {};

  if (params.before_message_seq != null) queryParams.before_message_seq = params.before_message_seq;
  if (params.messages_limit != null) queryParams.messages_limit = params.messages_limit;

  const parsed = await apiClient.get(
    `/api/v1/cases/${params.case_client_id}`,
    GetCaseResponseSchema,
    queryParams,
  );

  return parsed.data;
}
