import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import {
  CaseParticipantSchema,
  type AddParticipantsInput,
  type CaseParticipant,
} from '../types';

const AddParticipantsResponseSchema = ApiEnvelopeSchema(
  z.object({ added: z.array(CaseParticipantSchema) }),
).extend({ ok: z.literal(true) });

export async function addParticipants(input: AddParticipantsInput): Promise<CaseParticipant[]> {
  const { case_client_id, ...body } = input;
  const parsed = await apiClient.post(
    `/api/v1/cases/${case_client_id}/participants`,
    AddParticipantsResponseSchema,
    { ...body, case_client_id },
  );

  return parsed.data.added;
}
