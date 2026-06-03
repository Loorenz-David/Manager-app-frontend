import { ApiRequestError } from "@beyo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  notify,
  type TaskId,
  type TaskStepId,
  type WorkingSectionId,
} from "@beyo/lib";
import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { cancelPendingCompletion } from "../api/cancel-pending-completion";
import { taskStepKeys } from "../api/task-step-keys";

type CancelPendingStepCompletionInput = {
  task_id: TaskId;
  step_id: TaskStepId;
  working_section_id: WorkingSectionId;
};

function invalidateCompletionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  workingSectionId: WorkingSectionId,
): void {
  void queryClient.invalidateQueries({
    queryKey: taskStepKeys.sectionListsBySection(workingSectionId),
  });
  void queryClient.invalidateQueries({
    queryKey: workerWorkingSectionKeys.mine(),
  });
  void queryClient.invalidateQueries({
    queryKey: taskStepKeys.userLastActive(),
  });
}

export function useCancelPendingStepCompletion() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ task_id, step_id }: CancelPendingStepCompletionInput) =>
      cancelPendingCompletion({ task_id, step_id }),

    onSuccess: (_data, { working_section_id }) => {
      invalidateCompletionQueries(queryClient, working_section_id);
    },

    onError: (error, { working_section_id }) => {
      invalidateCompletionQueries(queryClient, working_section_id);

      if (error instanceof ApiRequestError && error.status === 409) {
        notify.error(
          "Could not undo",
          "The completion window has already passed.",
        );
        return;
      }

      notify.error(
        "Could not undo",
        error instanceof Error ? error.message : "Undo failed.",
      );
    },
  });

  return {
    cancelCompletion: mutation.mutate,
    cancelCompletionAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
