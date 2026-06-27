import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const MarkTaskNoteReadByResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({
  ok: z.literal(true),
});

export type MarkTaskNoteReadByInput = {
  taskId: string;
  noteId: string;
  userIds: string[];
};

export type MarkTaskNoteReadByResult = {
  client_id: string;
};

export async function markTaskNoteReadBy({
  taskId,
  noteId,
  userIds,
}: MarkTaskNoteReadByInput): Promise<MarkTaskNoteReadByResult> {
  const result = await apiClient.post(
    `/api/v1/tasks/${taskId}/notes/${noteId}/read-by`,
    MarkTaskNoteReadByResponseSchema,
    { user_ids: userIds },
  );

  return result.data;
}
