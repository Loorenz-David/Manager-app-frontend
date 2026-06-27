import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import type { TaskNoteContentBlock } from "../types";

const UpdateTaskNoteResponseSchema = ApiEnvelopeSchema(z.object({})).extend({
  ok: z.literal(true),
});

export type UpdateTaskNoteInput = {
  taskId: string;
  noteId: string;
  note_type?: string;
  content?: TaskNoteContentBlock[];
  plain_text?: string | null;
};

export async function updateTaskNote({
  taskId,
  noteId,
  ...patch
}: UpdateTaskNoteInput): Promise<void> {
  await apiClient.patch(
    `/api/v1/tasks/${taskId}/notes/${noteId}`,
    UpdateTaskNoteResponseSchema,
    patch,
  );
}
