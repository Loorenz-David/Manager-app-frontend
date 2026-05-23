import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import { UpholsteryPickerOptionSchema } from '../types';

const GetUpholsteryResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery: UpholsteryPickerOptionSchema,
  }),
);

export async function fetchUpholstery(clientId: string) {
  const response = await apiClient.get(
    `/api/v1/upholsteries/${clientId}`,
    GetUpholsteryResponseSchema,
  );
  return response.data.upholstery;
}
