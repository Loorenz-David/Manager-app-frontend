import { useMutation, useQueryClient } from "@tanstack/react-query";

import { taskNoteKeys } from "./task-note-keys";
import { updateTaskNote, type UpdateTaskNoteInput } from "./update-task-note";

export function useUpdateTaskNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTaskNoteInput) => updateTaskNote(input),
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: taskNoteKeys.list(input.taskId),
      });
    },
  });
}
