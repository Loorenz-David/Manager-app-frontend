import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPendingAcknowledgments } from "./fetch-pending-acknowledgments";
import { taskStepKeys } from "./task-step-keys";
import { seedTaskStepDetails } from "../lib/task-step-detail-cache";
import type { ReassignmentStep } from "../types";

export function usePendingAcknowledgmentsQuery() {
  const queryClient = useQueryClient();

  return useQuery<ReassignmentStep[]>({
    queryKey: taskStepKeys.reassignmentAcks(),
    queryFn: async ({ signal }) => {
      const steps = await fetchPendingAcknowledgments();
      if (!signal.aborted) {
        seedTaskStepDetails(queryClient, steps);
      }
      return steps;
    },
  });
}
