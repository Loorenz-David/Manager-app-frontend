import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify, type WorkingSectionId } from "@beyo/lib";
import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { transitionStepState } from "../api/transition-step-state";
import { taskStepKeys } from "../api/task-step-keys";
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

function patchStepStateInSectionCache(
  queryClient: ReturnType<typeof useQueryClient>,
  workingSectionId: WorkingSectionId,
  stepId: string,
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
        items: old.items.map((step) => {
          if (step.client_id !== stepId) {
            return step;
          }

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
            total_working_seconds:
              step.total_working_seconds + additionalWorkingSeconds,
            closed_at: STEP_TERMINAL_STATES.has(newState)
              ? new Date().toISOString()
              : null,
          };
        }),
      };
    },
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
        queryKey: taskStepKeys.userLastActive(),
      });

      const previousSectionLists =
        queryClient.getQueriesData<TaskStepsPagination>({
          queryKey: taskStepKeys.sectionListsBySection(working_section_id),
        });

      // Snapshot entire payload — includes batchSteps for rollback (correction 8)
      const previousLastActive =
        queryClient.getQueryData<UserLastActivePayload>(
          taskStepKeys.userLastActive(),
        );

      const now = new Date().toISOString();

      patchStepStateInSectionCache(
        queryClient,
        working_section_id,
        step_id,
        new_state,
        buildOptimisticStateRecord(new_state, now),
      );

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

        return undefined;
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

      return { previousSectionLists, previousLastActive };
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

      patchStepStateInSectionCache(
        queryClient,
        variables.working_section_id,
        data.step_id,
        data.new_state,
        data.last_state_record,
      );

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

    onError: (_err, _input, context) => {
      setPendingCompletion(null);
      context?.previousSectionLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
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

    onSettled: (_data, _err, { working_section_id, new_state }) => {
      if (new_state === "completed") {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.sectionListsBySection(working_section_id),
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
