import { useMutation, useQueryClient } from "@tanstack/react-query";

import { taskKeys } from "../api/task-keys";
import { taskStepKeys } from "../api/task-step-keys";
import { transitionTaskStep } from "../api/transition-task-step";
import type { StepState } from "../lib/step-state-variants";

export type TransitionTaskStepVariables = {
  step_id: string;
  new_state: StepState;
  credited_user_id?: string;
  reason?: string;
  description?: string;
  mark_closing_record_inaccurate?: boolean;
};

export function useTransitionTaskStep(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TransitionTaskStepVariables) =>
      transitionTaskStep({ ...input, task_id: taskId }),
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
