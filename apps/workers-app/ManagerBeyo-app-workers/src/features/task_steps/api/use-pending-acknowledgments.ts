import { useQuery } from "@tanstack/react-query";
import { fetchPendingAcknowledgments } from "./fetch-pending-acknowledgments";
import { taskStepKeys } from "./task-step-keys";
import type { ReassignmentStep } from "../types";

export function usePendingAcknowledgmentsQuery() {
  return useQuery<ReassignmentStep[]>({
    queryKey: taskStepKeys.reassignmentAcks(),
    queryFn: fetchPendingAcknowledgments,
  });
}
