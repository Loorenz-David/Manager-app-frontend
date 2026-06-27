import { useQuery } from "@tanstack/react-query";

import { fetchTaskNotes } from "./fetch-task-notes";
import { taskNoteKeys } from "./task-note-keys";

export function useTaskNotesQuery(taskId: string | null | undefined) {
  return useQuery({
    queryKey: taskId
      ? taskNoteKeys.list(taskId)
      : [...taskNoteKeys.lists(), "missing"],
    queryFn: () => {
      if (!taskId) {
        throw new Error("Task id is required.");
      }

      return fetchTaskNotes(taskId);
    },
    enabled: Boolean(taskId),
  });
}
