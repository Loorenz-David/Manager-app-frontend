import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updatePostHandling } from "../api/update-post-handling";
import { taskKeys } from "../api/task-keys";
import type { TaskDetailRaw } from "../types";

type UpdatePostHandlingContext = {
  snapshot: TaskDetailRaw | undefined;
  taskId: string;
};

export function useUpdatePostHandling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePostHandling,
    onMutate: async ({
      taskId,
      ...fields
    }): Promise<UpdatePostHandlingContext> => {
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
              ...fields,
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
      void queryClient.invalidateQueries({ queryKey: taskKeys.postHandling() });
    },
  });
}
