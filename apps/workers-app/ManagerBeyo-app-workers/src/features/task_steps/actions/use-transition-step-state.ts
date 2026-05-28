import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify, type WorkingSectionId } from "@beyo/lib";
import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { transitionStepState } from "../api/transition-step-state";
import { taskStepKeys } from "../api/task-step-keys";
import {
  STEP_TERMINAL_STATES,
  type StepState,
  type TaskStepsPagination,
  type TransitionStepStateInput,
} from "../types";

type TransitionInput = TransitionStepStateInput & {
  working_section_id: WorkingSectionId;
};

function buildOptimisticStateRecord(newState: StepState) {
  return {
    state: newState,
    entered_at: new Date().toISOString(),
    exited_at: null,
  };
}

function patchStepStateInSectionCache(
  queryClient: ReturnType<typeof useQueryClient>,
  workingSectionId: WorkingSectionId,
  stepId: string,
  newState: StepState,
  stateRecord: {
    state: StepState;
    entered_at: string;
    exited_at: string | null;
  },
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

          return {
            ...step,
            state: newState,
            last_state_record: stateRecord,
            closed_at: STEP_TERMINAL_STATES.has(newState)
              ? new Date().toISOString()
              : null,
          };
        }),
      };
    },
  );
}

export function useTransitionStepState() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      working_section_id: _sectionId,
      ...input
    }: TransitionInput) => transitionStepState(input),

    onMutate: async ({ step_id, new_state, working_section_id }) => {
      await queryClient.cancelQueries({
        queryKey: taskStepKeys.sectionListsBySection(working_section_id),
      });

      const previousSectionLists =
        queryClient.getQueriesData<TaskStepsPagination>({
          queryKey: taskStepKeys.sectionListsBySection(working_section_id),
        });

      patchStepStateInSectionCache(
        queryClient,
        working_section_id,
        step_id,
        new_state,
        buildOptimisticStateRecord(new_state),
      );

      return { previousSectionLists };
    },

    onSuccess: (data, variables) => {
      patchStepStateInSectionCache(
        queryClient,
        variables.working_section_id,
        data.step_id,
        data.new_state,
        data.last_state_record,
      );
    },

    onError: (_err, _input, context) => {
      context?.previousSectionLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });

      notify.error(
        "Action failed",
        "Step state could not be changed. Your changes have been reverted.",
      );
    },

    onSettled: (_data, _err, { working_section_id }) => {
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.sectionListsBySection(working_section_id),
      });
      void queryClient.invalidateQueries({
        queryKey: workerWorkingSectionKeys.mine(),
      });
    },
  });

  return {
    transitionStepState: mutation.mutate,
    transitionStepStateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    pendingStepId: mutation.isPending ? mutation.variables?.step_id : null,
    error: mutation.error,
  };
}

export type TransitionStepStateAction = ReturnType<
  typeof useTransitionStepState
>;
