import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { z } from "zod";

import type { UpdateItemInput } from "../types";

const UpdateItemResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({ ok: z.literal(true) });

export async function updateItem(input: UpdateItemInput) {
  const { id, ...body } = input;
  return apiClient.patch(`/api/v1/items/${id}`, UpdateItemResponseSchema, body);
}
