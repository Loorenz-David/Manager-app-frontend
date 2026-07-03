import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import type { TaskFulfillmentMethod } from "../types";

const UpdatePostHandlingResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({ ok: z.literal(true) });

export type UpdatePostHandlingInput = {
  taskId: string;
  fulfillment_method?: TaskFulfillmentMethod | null;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  assortment?: string | null;
};

export async function updatePostHandling({
  taskId,
  ...fields
}: UpdatePostHandlingInput) {
  return apiClient.patch(
    `/api/v1/tasks/${taskId}/post-handling`,
    UpdatePostHandlingResponseSchema,
    fields,
  );
}
