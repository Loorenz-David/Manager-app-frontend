import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify, type WorkingSectionId } from "@beyo/lib";
import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { transitionBatchStepStates } from "../api/transition-batch-step-states";
import { taskStepKeys } from "../api/task-step-keys";
// TEMPORARY — see lib/step-clock-debug.ts
import { logStepClock } from "../lib/step-clock-debug";
import type { BatchStepTransitionRequest } from "../types";

type BatchTransitionInput = BatchStepTransitionRequest & {
  working_section_id: WorkingSectionId;
};

export function useTransitionBatchStepStates() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: BatchTransitionInput) => {
      // TEMPORARY — see lib/step-clock-debug.ts
      logStepClock("batch-mutate", {
        to: input.new_state,
        count: input.items.length,
        ids: input.items.map((item) => item.step_id.slice(-6)),
      });
      return transitionBatchStepStates({
        items: input.items,
        new_state: input.new_state,
        pause_reason_id: input.pause_reason_id,
        description: input.description,
      });
    },

    onSuccess: (_data, variables) => {
      // TEMPORARY — see lib/step-clock-debug.ts
      logStepClock("batch-confirmed", {
        items: _data.items.map((item) => ({
          id: item.step_id.slice(-6),
          state: item.new_state,
          settled: item.total_working_seconds ?? null,
          enteredAt: item.last_state_record.entered_at.slice(11, 23),
        })),
      });

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
