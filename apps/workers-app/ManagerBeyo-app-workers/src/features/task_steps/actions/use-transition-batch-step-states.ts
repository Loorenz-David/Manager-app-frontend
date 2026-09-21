import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { itemEconomicsKeys } from "@beyo/item-economics";
import { notify, type WorkingSectionId } from "@beyo/lib";
import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { transitionBatchStepStates } from "../api/transition-batch-step-states";
import { taskStepKeys } from "../api/task-step-keys";
import { seedSettledWorkedSeconds } from "../lib/step-transition-cache";
import type {
  BatchStepTransitionRequest,
  LastStateRecord,
  StepState,
  TaskStep,
  TaskStepsPagination,
  UserLastActivePayload,
} from "../types";

type BatchTransitionInput = BatchStepTransitionRequest & {
  working_section_id: WorkingSectionId;
};

/**
 * Only pause and resume are applied optimistically. Completion keeps its own
 * choreography: its caller paints a celebration first and schedules the
 * refresh itself, so the rows must not change underneath it before then.
 */
const OPTIMISTIC_STATES: ReadonlySet<StepState> = new Set(["working", "paused"]);

type StepPatch = {
  state: StepState;
  record: LastStateRecord;
  /** Only known once the server answers; left untouched until then. */
  totalWorkingSeconds?: number;
};

function applyPatch(step: TaskStep, patch: StepPatch | undefined): TaskStep {
  if (!patch) {
    return step;
  }

  return {
    ...step,
    state: patch.state,
    last_state_record: patch.record,
    total_working_seconds:
      patch.totalWorkingSeconds ?? step.total_working_seconds,
  };
}

function patchSectionLists(
  queryClient: QueryClient,
  workingSectionId: WorkingSectionId,
  patches: ReadonlyMap<string, StepPatch>,
): void {
  queryClient.setQueriesData<TaskStepsPagination>(
    { queryKey: taskStepKeys.sectionListsBySection(workingSectionId) },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((step) =>
              applyPatch(step, patches.get(step.client_id)),
            ),
          }
        : old,
  );
}

// The floating card reads `batchSteps` for a batch and `step` for a single
// step; a batch member can be either, so both are patched.
function patchLastActive(
  queryClient: QueryClient,
  patches: ReadonlyMap<string, StepPatch>,
): void {
  queryClient.setQueryData<UserLastActivePayload>(
    taskStepKeys.userLastActive(),
    (current) =>
      current
        ? {
            step: current.step
              ? applyPatch(current.step, patches.get(current.step.client_id))
              : null,
            batchSteps:
              current.batchSteps?.map((step) =>
                applyPatch(step, patches.get(step.client_id)),
              ) ?? null,
          }
        : current,
  );
}

export function useTransitionBatchStepStates() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: BatchTransitionInput) =>
      transitionBatchStepStates({
        items: input.items,
        new_state: input.new_state,
        pause_reason_id: input.pause_reason_id,
        description: input.description,
      }),

    onMutate: async ({ items, new_state, working_section_id }) => {
      if (!OPTIMISTIC_STATES.has(new_state)) {
        return undefined;
      }

      // The budget poll runs on its own interval; one already in flight was
      // built before this transition and would re-seat the previous state.
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: taskStepKeys.sectionListsBySection(working_section_id),
        }),
        queryClient.cancelQueries({ queryKey: taskStepKeys.userLastActive() }),
        queryClient.cancelQueries({ queryKey: itemEconomicsKeys.tasks() }),
      ]);

      const previousSectionLists =
        queryClient.getQueriesData<TaskStepsPagination>({
          queryKey: taskStepKeys.sectionListsBySection(working_section_id),
        });
      const previousLastActive =
        queryClient.getQueryData<UserLastActivePayload>(
          taskStepKeys.userLastActive(),
        );

      // The settled total is deliberately not guessed here. With several steps
      // running at once each accrues only its share of the wall clock, which
      // the client cannot know; the budget projection already freezes each
      // card at the right value, and the response carries the real total.
      const enteredAt = new Date().toISOString();
      const patches = new Map<string, StepPatch>(
        items.map((item) => [
          item.step_id,
          {
            state: new_state,
            record: { state: new_state, entered_at: enteredAt, exited_at: null },
          },
        ]),
      );

      patchSectionLists(queryClient, working_section_id, patches);
      patchLastActive(queryClient, patches);

      return { previousSectionLists, previousLastActive };
    },

    onError: (error, _variables, context) => {
      if (context) {
        context.previousSectionLists.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
        queryClient.setQueryData(
          taskStepKeys.userLastActive(),
          context.previousLastActive,
        );
      }

      const message =
        error instanceof Error ? error.message : "Batch action failed.";
      notify.error("Batch action failed", message);
    },

    onSuccess: (data, variables) => {
      if (variables.new_state === "completed") {
        return;
      }

      const patches = new Map<string, StepPatch>(
        data.items.map((item) => [
          item.step_id,
          {
            state: item.new_state,
            record: item.last_state_record,
            totalWorkingSeconds: item.total_working_seconds,
          },
        ]),
      );

      patchSectionLists(queryClient, variables.working_section_id, patches);
      patchLastActive(queryClient, patches);

      for (const item of data.items) {
        if (item.total_working_seconds !== undefined) {
          seedSettledWorkedSeconds(
            queryClient,
            item.step_id,
            item.new_state,
            item.total_working_seconds,
          );
        }
      }
    },

    onSettled: (_data, _error, variables) => {
      // Completion feedback must paint before these refetches update the page
      // underneath it. The completion caller schedules the refresh after that
      // paint; other batch transitions reconcile here, success or failure.
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
