import type { QueryClient } from "@tanstack/react-query";
import {
  itemEconomicsKeys,
  type TaskBudgetAllocationsSnapshot,
} from "@beyo/item-economics";
import type { StepState } from "../types";

/**
 * Seeds the served budget row with the settled total a transition response
 * carries (settlement-window answer §5), so the card holds an authoritative
 * figure from the moment the request returns rather than from the refetch.
 * Shared by the single-step and batch transition actions.
 *
 * `state` and `worked_seconds` must move together: the projection adds elapsed
 * time on top of a row it believes is running, so a row left as `working` with
 * an already-complete total would count the run twice.
 *
 * `receivedAtMs` is deliberately left alone. It is the smoothing baseline for
 * every step in the snapshot, and re-anchoring it here would silently discard
 * the accrual of every other running step in the same payload.
 */
export function seedSettledWorkedSeconds(
  queryClient: QueryClient,
  stepId: string,
  newState: StepState,
  totalWorkingSeconds: number,
): void {
  queryClient.setQueriesData<TaskBudgetAllocationsSnapshot>(
    { queryKey: itemEconomicsKeys.taskBudgetAllocationsAll() },
    (old) => {
      if (!old) {
        return old;
      }

      let patched = false;
      const allocations = old.allocations.map((allocation) => ({
        ...allocation,
        steps: allocation.steps.map((step) => {
          if (step.step_id !== stepId) {
            return step;
          }

          patched = true;
          const deltaSeconds = totalWorkingSeconds - step.worked_seconds;
          return {
            ...step,
            state: newState,
            worked_seconds: totalWorkingSeconds,
            left_seconds:
              step.left_seconds === null
                ? null
                : step.left_seconds - deltaSeconds,
          };
        }),
      }));

      return patched ? { ...old, allocations } : old;
    },
  );
}
