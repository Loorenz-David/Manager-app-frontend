import { z } from "zod";

import { ClientIdSchema } from "@beyo/lib";
import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";

const CreateItemUpholsteryInputSchema = z.object({
  client_id: ClientIdSchema,
  item_id: z.string().min(1),
  upholstery_id: z.string().min(1),
  source: z.enum(["internal", "customer"]),
  amount_meters: z.number().optional(),
});

export type CreateItemUpholsteryInput = z.infer<
  typeof CreateItemUpholsteryInputSchema
>;

const CreateItemUpholsteryResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({
  ok: z.literal(true),
});

export async function createItemUpholstery(input: CreateItemUpholsteryInput) {
  return apiClient.put(
    "/api/v1/item-upholsteries",
    CreateItemUpholsteryResponseSchema,
    CreateItemUpholsteryInputSchema.parse(input),
  );
}
