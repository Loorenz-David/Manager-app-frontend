import { z } from 'zod';

import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';
import type { CaseId } from '@beyo/lib';

import { CaseLinkSchema, type CaseLink } from '../types';

const ListCaseLinksResponseSchema = ApiEnvelopeSchema(
  z.object({
    links: z.array(CaseLinkSchema),
  }),
).extend({
  ok: z.literal(true),
});

export async function listCaseLinks(caseClientId: CaseId): Promise<CaseLink[]> {
  const parsed = await apiClient.get(
    `/api/v1/cases/${caseClientId}/links`,
    ListCaseLinksResponseSchema,
  );

  return parsed.data.links;
}
