import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTaskSchedule } from "../api/update-task-schedule";
import { taskKeys } from "../api/task-keys";
import type { TaskDetailRaw } from "../types";

type UpdateTaskScheduleContext = {
  snapshot: TaskDetailRaw | undefined;
  taskId: string;
};

export function useUpdateTaskSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTaskSchedule,
    onMutate: async ({
      taskId,
      scheduled_start_at,
      scheduled_end_at,
    }): Promise<UpdateTaskScheduleContext> => {
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
              scheduled_start_at,
              scheduled_end_at,
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
