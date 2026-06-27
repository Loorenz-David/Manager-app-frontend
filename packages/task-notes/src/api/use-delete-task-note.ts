import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteTaskNote, type DeleteTaskNoteInput } from "./delete-task-note";
import { taskNoteKeys } from "./task-note-keys";

export function useDeleteTaskNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteTaskNoteInput) => deleteTaskNote(input),
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: taskNoteKeys.list(input.taskId),
      });
    },
  });
}
