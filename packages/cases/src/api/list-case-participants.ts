import { z } from 'zod';

import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';
import type { CaseId } from '@beyo/lib';

import { CaseParticipantSchema, type CaseParticipant } from '../types';

const ListCaseParticipantsResponseSchema = ApiEnvelopeSchema(
  z.object({
    participants: z.array(CaseParticipantSchema),
  }),
).extend({
  ok: z.literal(true),
});

export async function listCaseParticipants(caseClientId: CaseId): Promise<CaseParticipant[]> {
  const parsed = await apiClient.get(
    `/api/v1/cases/${caseClientId}/participants`,
    ListCaseParticipantsResponseSchema,
  );

  return parsed.data.participants;
}
