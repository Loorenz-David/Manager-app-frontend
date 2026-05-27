import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import { UpholsteryPickerOptionSchema } from '../types';

const UpdateListOrderResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery: UpholsteryPickerOptionSchema,
  }),
);

export type UpdateListOrderInput = {
  client_id: string;
  list_order: number | null;
};

export async function fetchUpdateUpholsteryListOrder(input: UpdateListOrderInput) {
  const response = await apiClient.patch(
    `/api/v1/upholsteries/${input.client_id}/list-order`,
    UpdateListOrderResponseSchema,
    { list_order: input.list_order },
  );

  return response.data.upholstery;
}
