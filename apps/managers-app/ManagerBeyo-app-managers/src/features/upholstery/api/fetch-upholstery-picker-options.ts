import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import {
  type ListUpholsteryPickerParams,
  UpholsteryPickerOptionSchema,
} from '../types';

const ListUpholsteryPickerResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholsteries: z.array(UpholsteryPickerOptionSchema),
    upholsteries_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number(),
      offset: z.number(),
    }),
  }),
);

export async function fetchUpholsteryPickerOptions(
  params: ListUpholsteryPickerParams = {},
): Promise<{ upholsteries: z.infer<typeof UpholsteryPickerOptionSchema>[]; has_more: boolean }> {
  const response = await apiClient.get('/api/v1/upholsteries', ListUpholsteryPickerResponseSchema, {
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
    q: params.q,
  });

  return {
    upholsteries: response.data.upholsteries,
    has_more: response.data.upholsteries_pagination.has_more,
  };
}
