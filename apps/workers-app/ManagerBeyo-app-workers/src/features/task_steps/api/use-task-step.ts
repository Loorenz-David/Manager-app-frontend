import { useQuery } from "@tanstack/react-query";
import type { TaskStepId } from "@beyo/lib";
import { fetchTaskStep } from "./fetch-task-step";
import { taskStepKeys } from "./task-step-keys";
import type { TaskStep } from "../types";

/**
 * The detail surface's step. `initialStep` is the row the opener already had:
 * it paints first, but it is dated to the epoch so the entry refetches on
 * mount instead of being trusted for a full stale window — the opener's copy
 * may predate a transition made elsewhere.
 */
export function useTaskStepQuery(stepId: TaskStepId, initialStep?: TaskStep) {
  return useQuery({
    queryKey: taskStepKeys.detail(stepId),
    queryFn: () => fetchTaskStep(stepId),
    enabled: Boolean(stepId),
    initialData:
      initialStep && initialStep.client_id === stepId ? initialStep : undefined,
    initialDataUpdatedAt: 0,
  });
}
