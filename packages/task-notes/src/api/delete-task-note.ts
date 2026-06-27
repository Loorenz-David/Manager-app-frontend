import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const DeleteTaskNoteResponseSchema = ApiEnvelopeSchema(z.object({})).extend({
  ok: z.literal(true),
});

export type DeleteTaskNoteInput = {
  taskId: string;
  noteId: string;
};

export async function deleteTaskNote({
  taskId,
  noteId,
}: DeleteTaskNoteInput): Promise<void> {
  await apiClient.delete(
    `/api/v1/tasks/${taskId}/notes/${noteId}`,
    DeleteTaskNoteResponseSchema,
  );
}
