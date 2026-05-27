import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import { UpholsteryPickerOptionSchema } from '../types';

const ToggleFavoriteResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery: UpholsteryPickerOptionSchema,
  }),
);

export type ToggleFavoriteInput = {
  client_id: string;
  favorite: boolean;
};

export async function fetchToggleUpholsteryFavorite(input: ToggleFavoriteInput) {
  const response = await apiClient.patch(
    `/api/v1/upholsteries/${input.client_id}/favorite`,
    ToggleFavoriteResponseSchema,
    { favorite: input.favorite },
  );

  return response.data.upholstery;
}
