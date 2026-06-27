import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTaskNote, type CreateTaskNoteInput } from "./create-task-note";
import { taskNoteKeys } from "./task-note-keys";

export function useCreateTaskNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskNoteInput) => createTaskNote(input),
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: taskNoteKeys.list(input.taskId),
      });
    },
  });
}
