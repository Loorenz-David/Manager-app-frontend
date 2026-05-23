import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const SetItemUpholsteryQuantityInputSchema = z.object({
  itemUpholsteryId: z.string(),
  amount_meters: z.number(),
});
export type SetItemUpholsteryQuantityInput = z.infer<typeof SetItemUpholsteryQuantityInputSchema>;

const SetItemUpholsteryQuantityResponseSchema = ApiEnvelopeSchema(z.object({})).extend({
  ok: z.literal(true),
});

export async function setItemUpholsteryQuantity(input: SetItemUpholsteryQuantityInput) {
  const { itemUpholsteryId, ...body } = SetItemUpholsteryQuantityInputSchema.parse(input);
  return apiClient.post(
    `/api/v1/item-upholsteries/${itemUpholsteryId}/update-quantity`,
    SetItemUpholsteryQuantityResponseSchema,
    body,
  );
}
