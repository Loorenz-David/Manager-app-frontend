import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addTaskStep } from "../api/add-task-step";
import { taskKeys } from "../api/task-keys";
import { taskStepKeys } from "../api/task-step-keys";

export type AddTaskStepVariables = {
  working_section_id: string;
  worker_id?: string;
  client_id?: string;
  sequence_order?: number;
  working_section_name_snapshot?: string | null;
  assigned_worker_display_name_snapshot?: string | null;
};

export function useAddTaskStep(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      working_section_name_snapshot: _sectionName,
      assigned_worker_display_name_snapshot: _workerName,
      ...input
    }: AddTaskStepVariables) => addTaskStep({ task_id: taskId, steps: [input] }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.detail(taskId as never),
      });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.byTask(taskId),
      });
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.counts(taskId),
      });
    },
  });
}
