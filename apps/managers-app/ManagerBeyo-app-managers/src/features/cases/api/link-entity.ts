import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import { CaseLinkSchema, type CaseLink, type LinkEntityInput } from '../types';

const LinkEntityResponseSchema = ApiEnvelopeSchema(
  z.object({ link: CaseLinkSchema }),
).extend({ ok: z.literal(true) });

export async function linkEntity(input: LinkEntityInput): Promise<CaseLink> {
  const { case_client_id, ...body } = input;
  const parsed = await apiClient.post(
    `/api/v1/cases/${case_client_id}/links`,
    LinkEntityResponseSchema,
    { ...body, case_client_id },
  );

  return parsed.data.link;
}
