import { useQuery } from "@tanstack/react-query";
import { fetchReassignedStepsCount } from "./fetch-reassigned-steps-count";
import { reassignedStepKeys } from "./reassigned-step-keys";

/**
 * Badge count. One SQL statement server-side (handoff §4), so it is safe to
 * refetch on mount and on window focus — the defaults already do both.
 */
export function useReassignedStepsCountQuery() {
  return useQuery({
    queryKey: reassignedStepKeys.count(),
    queryFn: fetchReassignedStepsCount,
  });
}
