import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify, type TaskStepId } from "@beyo/lib";
import { acknowledgeReassignments } from "../api/acknowledge-reassignments";
import { taskStepKeys } from "../api/task-step-keys";
import type { ReassignmentStep } from "../types";

export function useAcknowledgeReassignments() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: { step_ids: TaskStepId[] }) =>
      acknowledgeReassignments(input),

    onMutate: async ({ step_ids }) => {
      await queryClient.cancelQueries({
        queryKey: taskStepKeys.reassignmentAcks(),
      });

      const previous = queryClient.getQueryData<ReassignmentStep[]>(
        taskStepKeys.reassignmentAcks(),
      );

      const removing = new Set<string>(step_ids);
      queryClient.setQueryData<ReassignmentStep[]>(
        taskStepKeys.reassignmentAcks(),
        (current) =>
          current?.filter(
            (item) => !removing.has(item.acknowledgment.step_id),
          ) ?? current,
      );

      return { previous };
    },

    onError: (_err, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<ReassignmentStep[]>(
          taskStepKeys.reassignmentAcks(),
          context.previous,
        );
      }
      notify.error(
        "Action failed",
        "The reassignment could not be acknowledged. Please try again.",
      );
    },

    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.reassignmentAcks(),
      });
    },
  });

  return {
    acknowledge: mutation.mutate,
    isPending: mutation.isPending,
    pendingStepIds: mutation.isPending
      ? (mutation.variables?.step_ids ?? null)
      : null,
  };
}

export type AcknowledgeReassignmentsAction = ReturnType<
  typeof useAcknowledgeReassignments
>;
