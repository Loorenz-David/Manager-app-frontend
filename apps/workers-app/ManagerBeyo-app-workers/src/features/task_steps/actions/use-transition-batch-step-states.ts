import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify, type WorkingSectionId } from "@beyo/lib";
import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { transitionBatchStepStates } from "../api/transition-batch-step-states";
import { taskStepKeys } from "../api/task-step-keys";
import type { BatchStepTransitionRequest } from "../types";

type BatchTransitionInput = BatchStepTransitionRequest & {
  working_section_id: WorkingSectionId;
};

export function useTransitionBatchStepStates() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: BatchTransitionInput) =>
      transitionBatchStepStates({
        items: input.items,
        new_state: input.new_state,
        reason: input.reason,
        description: input.description,
      }),

    onSuccess: (_data, variables) => {
      // Completion feedback must paint before these refetches update the page
      // underneath it. The completion caller schedules the refresh after that
      // paint; other batch transitions can refresh immediately.
      if (variables.new_state === "completed") {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.sectionListsBySection(variables.working_section_id),
      });
      void queryClient.invalidateQueries({
        queryKey: workerWorkingSectionKeys.mine(),
      });
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.userLastActive(),
      });
    },

    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Batch action failed.";
      notify.error("Batch action failed", message);
    },
  });

  return {
    transitionBatch: mutation.mutate,
    transitionBatchAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export type TransitionBatchStepStatesAction = ReturnType<
  typeof useTransitionBatchStepStates
>;
