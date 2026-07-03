import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import type { UpdateTaskInput } from "../types";

const TaskMutationResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({ ok: z.literal(true) });

export async function updateTask(input: UpdateTaskInput): Promise<void> {
  const { id, ...body } = input;
  await apiClient.patch(`/api/v1/tasks/${id}`, TaskMutationResponseSchema, body);
}
