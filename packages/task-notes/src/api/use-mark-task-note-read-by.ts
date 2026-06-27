import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  markTaskNoteReadBy,
  type MarkTaskNoteReadByInput,
} from "./mark-task-note-read-by";
import { taskNoteKeys } from "./task-note-keys";
import type { TaskNoteApiEntry } from "../types";

export function useMarkTaskNoteReadBy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MarkTaskNoteReadByInput) => markTaskNoteReadBy(input),
    onMutate: async (input) => {
      const queryKey = taskNoteKeys.list(input.taskId);

      await queryClient.cancelQueries({ queryKey });

      const snapshot = queryClient.getQueryData<TaskNoteApiEntry[]>(queryKey);

      queryClient.setQueryData<TaskNoteApiEntry[]>(queryKey, (old) =>
        old?.map((entry) => {
          if (entry.note.client_id !== input.noteId) {
            return entry;
          }

          const existing = new Set(entry.note.users_read_list);
          for (const userId of input.userIds) {
            existing.add(userId);
          }

          return {
            ...entry,
            note: {
              ...entry.note,
              users_read_list: Array.from(existing),
            },
          };
        }) ?? [],
      );

      return { snapshot };
    },
    onError: (_error, input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskNoteKeys.list(input.taskId), context.snapshot);
      }
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: taskNoteKeys.list(input.taskId),
      });
    },
  });
}
