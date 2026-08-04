import { useMutation, useQueryClient } from "@tanstack/react-query";

import { forceTaskReady } from "../api/force-task-ready";
import { taskKeys } from "../api/task-keys";
import { taskStepKeys } from "../api/task-step-keys";

/**
 * No optimistic update on purpose. The task's next state is decided by the
 * backend's readiness evaluation, and success creates post-handling and
 * customer-coordination instances the frontend cannot model — the two cases
 * 05_server_state names for skipping `onMutate`. The call is all-or-nothing,
 * so there is no partial state to reconcile on failure either.
 */
export function useForceTaskReady() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: forceTaskReady,

    onSettled: (_data, _error, { task_id }) => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.detail(task_id),
        refetchType: "active",
      });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: taskKeys.postHandling(),
        refetchType: "all",
      });
      void queryClient.invalidateQueries({ queryKey: taskStepKeys.all });
    },
  });

  return {
    forceTaskReady: mutation.mutate,
    forceTaskReadyAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}

export type ForceTaskReadyAction = ReturnType<typeof useForceTaskReady>;
