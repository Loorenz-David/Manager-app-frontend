import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const SetItemUpholsteryAmountInputSchema = z.object({
  itemUpholsteryId: z.string(),
  amount_meters: z.number(),
});

export type SetItemUpholsteryAmountInput = z.infer<
  typeof SetItemUpholsteryAmountInputSchema
>;

const SetItemUpholsteryAmountResponseSchema = ApiEnvelopeSchema(
  z.object({}),
).extend({ ok: z.literal(true) });

export async function setItemUpholsteryAmount(
  input: SetItemUpholsteryAmountInput,
) {
  const { itemUpholsteryId, ...body } =
    SetItemUpholsteryAmountInputSchema.parse(input);
  return apiClient.post(
    `/api/v1/item-upholsteries/${itemUpholsteryId}/update-quantity`,
    SetItemUpholsteryAmountResponseSchema,
    body,
  );
}
