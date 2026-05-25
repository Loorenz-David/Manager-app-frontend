import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const UpdateItemUpholsteryInputSchema = z.object({
  itemUpholsteryId: z.string(),
  upholstery_id: z.string().min(1),
});
export type UpdateItemUpholsteryInput = z.infer<typeof UpdateItemUpholsteryInputSchema>;

const UpdateItemUpholsteryResponseSchema = ApiEnvelopeSchema(z.object({})).extend({
  ok: z.literal(true),
});

export async function updateItemUpholstery(input: UpdateItemUpholsteryInput) {
  const { itemUpholsteryId, ...body } = UpdateItemUpholsteryInputSchema.parse(input);
  return apiClient.patch(
    `/api/v1/item-upholsteries/${itemUpholsteryId}`,
    UpdateItemUpholsteryResponseSchema,
    body,
  );
}
