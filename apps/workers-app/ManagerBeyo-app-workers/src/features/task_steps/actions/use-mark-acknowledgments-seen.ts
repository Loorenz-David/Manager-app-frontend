import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskStepId } from "@beyo/lib";
import { markAcknowledgmentsSeen } from "../api/mark-acknowledgments-seen";
import { taskStepKeys } from "../api/task-step-keys";
import type { ReassignmentStep } from "../types";

// Passive read receipt. Idempotent server-side; on success we patch the cached
// `first_seen_at` in place so the panel stops re-firing /seen after a refetch.
// No optimistic rollback — a failed receipt is a no-op, never surfaced to the user.
export function useMarkAcknowledgmentsSeen() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: { step_ids: TaskStepId[] }) =>
      markAcknowledgmentsSeen(input),

    onSuccess: ({ seen_step_ids }) => {
      if (seen_step_ids.length === 0) {
        return;
      }
      const seen = new Set(seen_step_ids);
      const now = new Date().toISOString();

      queryClient.setQueryData<ReassignmentStep[]>(
        taskStepKeys.reassignmentAcks(),
        (current) => {
          if (!current) {
            return current;
          }
          return current.map((item) =>
            seen.has(item.acknowledgment.step_id)
              ? {
                  ...item,
                  acknowledgment: {
                    ...item.acknowledgment,
                    first_seen_at: item.acknowledgment.first_seen_at ?? now,
                  },
                }
              : item,
          );
        },
      );
    },
  });

  return {
    markSeen: mutation.mutate,
    isPending: mutation.isPending,
  };
}

export type MarkAcknowledgmentsSeenAction = ReturnType<
  typeof useMarkAcknowledgmentsSeen
>;
