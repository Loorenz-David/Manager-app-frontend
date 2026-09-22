import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runWhenUiSettled } from "@beyo/ui";
import { itemEconomicsKeys } from "@beyo/item-economics";
import { notify, type TaskStepId, type WorkingSectionId } from "@beyo/lib";
import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { transitionStepState } from "../api/transition-step-state";
import { taskStepKeys } from "../api/task-step-keys";
import { seedSettledWorkedSeconds } from "../lib/step-transition-cache";
import { patchTaskStepDetail } from "../lib/task-step-detail-cache";
import {
  type PendingStepCompletion,
  STEP_TERMINAL_STATES,
  type LastStateRecord,
  type StepState,
  type TaskStep,
  type TaskStepsPagination,
  type TransitionStepStateInput,
  type UserLastActivePayload,
} from "../types";

type TransitionInput = TransitionStepStateInput & {
  working_section_id: WorkingSectionId;
};

function buildOptimisticStateRecord(
  newState: StepState,
  enteredAt: string,
): LastStateRecord {
  return {
    state: newState,
    entered_at: enteredAt,
    exited_at: null,
  };
}

function applyStateRecord(
  step: TaskStep,
  newState: StepState,
  stateRecord: LastStateRecord,
): TaskStep {
  const additionalWorkingSeconds =
    step.state === "working" &&
    (newState === "paused" || newState === "ended_shift") &&
    step.last_state_record?.entered_at
      ? Math.max(
          0,
          Math.floor(
            (new Date(stateRecord.entered_at).getTime() -
              new Date(step.last_state_record.entered_at).getTime()) /
              1000,
          ),
        )
      : 0;

  return {
    ...step,
    state: newState,
    last_state_record: stateRecord,
    total_working_seconds: step.total_working_seconds + additionalWorkingSeconds,
    closed_at: STEP_TERMINAL_STATES.has(newState)
      ? new Date().toISOString()
      : null,
  };
}

// The step lives in two kinds of entry: the section's list pages and its own
// detail entry (the detail surface's only source). Both take the same record.
function patchStepStateInCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  workingSectionId: WorkingSectionId,
  stepId: TaskStepId,
  newState: StepState,
  stateRecord: LastStateRecord,
) {
  queryClient.setQueriesData<TaskStepsPagination>(
    {
      queryKey: taskStepKeys.sectionListsBySection(workingSectionId),
    },
    (old) => {
      if (!old) {
        return old;
      }

      return {
        ...old,
        items: old.items.map((step) =>
          step.client_id === stepId
            ? applyStateRecord(step, newState, stateRecord)
            : step,
        ),
      };
    },
  );
  patchTaskStepDetail(queryClient, stepId, (step) =>
    applyStateRecord(step, newState, stateRecord),
  );
}

// Patches the `step` field within a UserLastActivePayload.
// Leaves `batchSteps` unchanged — critical invariant (correction 8).
function patchOptimisticLastActiveStep(
  current: TaskStep | null | undefined,
  sectionListLookup: (stepId: string) => TaskStep | undefined,
  stepId: string,
  newState: StepState,
  now: string,
): TaskStep | null {
  if (newState === "working") {
    const base =
      sectionListLookup(stepId) ??
      (current?.client_id === stepId ? current : null);

    if (!base) {
      return current ?? null;
    }

    return {
      ...base,
      state: "working",
      last_state_record: base.last_state_record
        ? {
            ...base.last_state_record,
            state: "working",
            entered_at: now,
            exited_at: null,
          }
        : {
            state: "working",
            entered_at: now,
            exited_at: null,
          },
    };
  }

  if (current?.client_id !== stepId) {
    return current ?? null;
  }

  const additionalWorkingSeconds =
    current.state === "working" &&
    (newState === "paused" || newState === "ended_shift") &&
    current.last_state_record?.entered_at
      ? Math.max(
          0,
          Math.floor(
            (new Date(now).getTime() -
              new Date(current.last_state_record.entered_at).getTime()) /
              1000,
          ),
        )
      : 0;

  return {
    ...current,
    state: newState,
    total_working_seconds:
      current.total_working_seconds + additionalWorkingSeconds,
    last_state_record: current.last_state_record
      ? {
          ...current.last_state_record,
          state: newState,
          entered_at: now,
          exited_at: null,
        }
      : {
          state: newState,
          entered_at: now,
          exited_at: null,
        },
  };
}

export function useTransitionStepState() {
  const queryClient = useQueryClient();
  const [pendingCompletion, setPendingCompletion] =
    useState<PendingStepCompletion | null>(null);

  const mutation = useMutation({
    mutationFn: ({
      working_section_id: _sectionId,
      ...input
    }: TransitionInput) => transitionStepState(input),

    onMutate: async ({ step_id, new_state, working_section_id }) => {
      if (new_state !== "completed") {
        setPendingCompletion(null);
      }

      await queryClient.cancelQueries({
        queryKey: taskStepKeys.sectionListsBySection(working_section_id),
      });
      await queryClient.cancelQueries({
        queryKey: taskStepKeys.detail(step_id),
      });
      await queryClient.cancelQueries({
        queryKey: taskStepKeys.userLastActive(),
      });
      // The budget poll runs on its own 45s interval. One already in flight was
      // built before this transition, so letting it land would seat a payload
      // that still describes the previous state — the timer's anchor. The
      // socket handler and onSettled below refetch it afterwards either way.
      await queryClient.cancelQueries({
        queryKey: itemEconomicsKeys.tasks(),
      });

      const previousSectionLists =
        queryClient.getQueriesData<TaskStepsPagination>({
          queryKey: taskStepKeys.sectionListsBySection(working_section_id),
        });
      const previousDetail = queryClient.getQueryData<TaskStep>(
        taskStepKeys.detail(step_id),
      );

      // Snapshot entire payload — includes batchSteps for rollback (correction 8)
      const previousLastActive =
        queryClient.getQueryData<UserLastActivePayload>(
          taskStepKeys.userLastActive(),
        );

      const now = new Date().toISOString();

      patchStepStateInCaches(
        queryClient,
        working_section_id,
        step_id,
        new_state,
        buildOptimisticStateRecord(new_state, now),
      );

      // The pre-tap row, from whichever entry holds it: a list page, or the
      // detail entry when the step was opened from outside any list.
      const sectionListLookup = (
        targetStepId: string,
      ): TaskStep | undefined => {
        const allSectionLists = queryClient.getQueriesData<TaskStepsPagination>(
          {
            queryKey: taskStepKeys.sectionLists(),
          },
        );

        for (const [, data] of allSectionLists) {
          if (!data) {
            continue;
          }

          const found = data.items.find(
            (step) => step.client_id === targetStepId,
          );
          if (found) {
            return found;
          }
        }

        return targetStepId === step_id ? previousDetail : undefined;
      };

      // Patch only `step` inside the payload — never overwrite `batchSteps` (correction 8)
      queryClient.setQueryData<UserLastActivePayload>(
        taskStepKeys.userLastActive(),
        (current) => {
          if (!current) return { step: null, batchSteps: null };
          return {
            ...current,
            step: patchOptimisticLastActiveStep(
              current.step,
              sectionListLookup,
              step_id,
              new_state,
              now,
            ),
          };
        },
      );

      return { previousSectionLists, previousDetail, previousLastActive };
    },

    onSuccess: (data, variables) => {
      if (data.kind === "pending_completion") {
        setPendingCompletion({
          pendingCompletionId: data.pending_completion_id,
          expiresAt: data.expires_at,
          stepId: variables.step_id,
          workingSectionId: variables.working_section_id,
        });
        return;
      }

      setPendingCompletion(null);

      patchStepStateInCaches(
        queryClient,
        variables.working_section_id,
        data.step_id,
        data.new_state,
        data.last_state_record,
      );

      if (data.total_working_seconds !== undefined) {
        seedSettledWorkedSeconds(
          queryClient,
          data.step_id,
          data.new_state,
          data.total_working_seconds,
        );
      }

      // For paused / ended_shift transitions, patch userLastActive in-place with
      // the server-confirmed state — no network round-trip, no flicker.
      // Only patches `step`; `batchSteps` is left unchanged (correction 8).
      if (data.new_state === "paused" || data.new_state === "ended_shift") {
        queryClient.setQueryData<UserLastActivePayload>(
          taskStepKeys.userLastActive(),
          (currentPayload) => {
            if (!currentPayload) return { step: null, batchSteps: null };
            if (
              !currentPayload.step ||
              currentPayload.step.client_id !== data.step_id
            ) {
              return currentPayload;
            }
            return {
              ...currentPayload,
              step: {
                ...currentPayload.step,
                state: data.new_state,
                last_state_record: data.last_state_record,
              },
            };
          },
        );
      }
    },

    onError: (_err, input, context) => {
      setPendingCompletion(null);
      context?.previousSectionLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      queryClient.setQueryData(
        taskStepKeys.detail(input.step_id),
        context?.previousDetail,
      );
      // Restore full UserLastActivePayload snapshot (including batchSteps)
      queryClient.setQueryData<UserLastActivePayload>(
        taskStepKeys.userLastActive(),
        context?.previousLastActive ?? { step: null, batchSteps: null },
      );

      notify.error(
        "Action failed",
        "Step state could not be changed. Your changes have been reverted.",
      );
    },

    onSettled: (_data, _err, { step_id, working_section_id, new_state }) => {
      if (new_state === "completed") {
        return;
      }

      // Let the surface finish closing and the row finish animating out
      // before the refetch storm hits the list underneath.
      runWhenUiSettled(() => {
        void queryClient.invalidateQueries({
          queryKey: taskStepKeys.sectionListsBySection(working_section_id),
        });
        void queryClient.invalidateQueries({
          queryKey: taskStepKeys.detail(step_id),
        });
        void queryClient.invalidateQueries({
          queryKey: workerWorkingSectionKeys.mine(),
        });
        void queryClient.invalidateQueries({
          queryKey: taskStepKeys.userLastActive(),
        });
      });
    },
  });

  return {
    transitionStepState: mutation.mutate,
    transitionStepStateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    pendingStepId: mutation.isPending ? mutation.variables?.step_id : null,
    error: mutation.error,
    pendingCompletion,
    clearPendingCompletion: () => setPendingCompletion(null),
  };
}

export type TransitionStepStateAction = ReturnType<
  typeof useTransitionStepState
>;
