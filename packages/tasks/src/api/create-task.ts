import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const CreateTaskResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
    task_scalar_id: z.number().int(),
    // Both present only when the request carried an `item`
    // (HANDOFF_TO_FRONTEND_sku_template_gapless_allocation_20260804 §3).
    // `item_sku` is the item's final SKU, including one the backend just
    // assigned from the task type's template — this is the only place that
    // value can be read, and it is final the instant the response returns. It
    // is null when the item has no SKU at all: a task type without a template,
    // or an existing item matched by article number that never had one.
    item_id: z.string().optional(),
    item_sku: z.string().nullable().optional(),
  }),
).extend({ ok: z.literal(true) });

export type CreateTaskResult = z.infer<typeof CreateTaskResponseSchema>["data"];

export async function createTask(
  payload: Record<string, unknown>,
): Promise<CreateTaskResult> {
  const parsed = await apiClient.put(
    "/api/v1/tasks",
    CreateTaskResponseSchema,
    payload,
  );
  return parsed.data;
}
