import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const CreateTaskResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
    task_scalar_id: z.number().int(),
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
