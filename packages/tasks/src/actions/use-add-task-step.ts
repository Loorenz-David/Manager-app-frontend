import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { TaskDetailRaw } from "../types";
import { addTaskStep } from "../api/add-task-step";
import { taskKeys } from "../api/task-keys";

export type AddTaskStepVariables = {
  working_section_id: string;
  worker_id?: string;
  client_id?: string;
  sequence_order?: number;
  working_section_name_snapshot?: string | null;
  assigned_worker_display_name_snapshot?: string | null;
};

type AddTaskStepContext = {
  snapshot: TaskDetailRaw | undefined;
};

export function useAddTaskStep(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      working_section_name_snapshot: _sectionName,
      assigned_worker_display_name_snapshot: _workerName,
      ...input
    }: AddTaskStepVariables) => addTaskStep({ task_id: taskId, steps: [input] }),
    onMutate: async (): Promise<AddTaskStepContext> => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(
        taskKeys.detail(taskId as never),
      );

      return { snapshot };
    },
    onError: (_error, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(taskId as never), context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.detail(taskId as never),
      });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
