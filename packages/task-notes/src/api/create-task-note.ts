import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import type { TaskNoteInlinePayload } from "../types";

const CreateTaskNoteResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_ids: z.array(z.string()),
  }),
).extend({
  ok: z.literal(true),
});

export type CreateTaskNoteInput = {
  taskId: string;
  notes: TaskNoteInlinePayload[];
};

export async function createTaskNote({
  taskId,
  notes,
}: CreateTaskNoteInput): Promise<string[]> {
  const result = await apiClient.post(
    `/api/v1/tasks/${taskId}/notes`,
    CreateTaskNoteResponseSchema,
    notes,
  );

  return result.data.client_ids;
}
