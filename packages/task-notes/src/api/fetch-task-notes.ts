import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { TaskNoteApiEntrySchema, type TaskNoteApiEntry } from "../types";

const ListTaskNotesResponseSchema = ApiEnvelopeSchema(
  z.object({
    task_notes: z.array(TaskNoteApiEntrySchema),
  }),
).extend({
  ok: z.literal(true),
});

export async function fetchTaskNotes(taskId: string): Promise<TaskNoteApiEntry[]> {
  const result = await apiClient.get(
    `/api/v1/tasks/${taskId}/notes`,
    ListTaskNotesResponseSchema,
  );

  return result.data.task_notes;
}
