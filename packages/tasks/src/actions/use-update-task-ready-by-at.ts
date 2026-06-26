import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTaskReadyByAt } from "../api/update-task-ready-by-at";
import { taskKeys } from "../api/task-keys";
import type { TaskDetailRaw } from "../types";

type UpdateTaskReadyByAtContext = {
  snapshot: TaskDetailRaw | undefined;
  taskId: string;
};

export function useUpdateTaskReadyByAt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTaskReadyByAt,
    onMutate: async ({
      taskId,
      ready_by_at,
    }): Promise<UpdateTaskReadyByAtContext> => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(
        taskKeys.detail(taskId as never),
      );

      queryClient.setQueryData<TaskDetailRaw>(
        taskKeys.detail(taskId as never),
        (old) => {
          if (!old) {
            return old;
          }

          return {
            ...old,
            task: {
              ...old.task,
              ready_by_at,
            },
          };
        },
      );

      return { snapshot, taskId };
    },
    onError: (_error, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(
          taskKeys.detail(context.taskId as never),
          context.snapshot,
        );
      }
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.detail(input.taskId as never),
      });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
