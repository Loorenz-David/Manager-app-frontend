import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import { WorkingSectionPickerOptionSchema } from '../types';

const ListWorkingSectionsResponseSchema = ApiEnvelopeSchema(
  z.object({
    working_sections: z.array(WorkingSectionPickerOptionSchema),
    working_sections_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number(),
      offset: z.number(),
    }),
  }),
);

export async function fetchWorkingSectionsPicker() {
  const response = await apiClient.get(
    '/api/v1/working-sections',
    ListWorkingSectionsResponseSchema,
    {
      limit: 200,
      offset: 0,
    },
  );

  return {
    workingSections: response.data.working_sections,
  };
}
