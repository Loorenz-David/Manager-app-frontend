import type { QueryClient } from "@tanstack/react-query";
import type { TaskStepId } from "@beyo/lib";
import { taskStepKeys } from "../api/task-step-keys";
import type { TaskStep } from "../types";

/**
 * The per-step detail entry (`taskStepKeys.detail`) is the detail surface's
 * only data source. Three writers feed it and the last write wins:
 *
 *  - every list fetch (section pages, last-active, pending acknowledgments)
 *    writes each row through `seedTaskStepDetails`;
 *  - the single-step route refetches it directly;
 *  - the transition actions patch it, optimistically and then with the
 *    server's record, through `patchTaskStepDetail`.
 *
 * The upholstery group fields are the one place "last write wins" is wrong:
 * an ungrouped list page sends them as `null` while the single-step route and
 * a grouped page resolve them, so a `null` from a list must not blank a value
 * another writer already resolved (answer handoff, "upholstery_group_*").
 */
const UPHOLSTERY_GROUP_FIELDS = [
  "upholstery_group_key",
  "upholstery_group_image_url",
  "upholstery_group_upholstery_id",
  "upholstery_group_inventory",
] as const satisfies readonly (keyof TaskStep)[];

function mergeSeededStep(existing: TaskStep | undefined, incoming: TaskStep): TaskStep {
  if (!existing) {
    return incoming;
  }

  let merged: TaskStep = incoming;
  for (const field of UPHOLSTERY_GROUP_FIELDS) {
    if (incoming[field] == null && existing[field] != null) {
      merged = { ...merged, [field]: existing[field] };
    }
  }
  return merged;
}

export function seedTaskStepDetails(
  queryClient: QueryClient,
  steps: readonly TaskStep[],
): void {
  for (const step of steps) {
    queryClient.setQueryData<TaskStep>(
      taskStepKeys.detail(step.client_id as TaskStepId),
      (existing) => mergeSeededStep(existing, step),
    );
  }
}

/** Applies `update` to the detail entry when one exists; a missing entry stays missing. */
export function patchTaskStepDetail(
  queryClient: QueryClient,
  stepId: TaskStepId,
  update: (step: TaskStep) => TaskStep,
): void {
  queryClient.setQueryData<TaskStep>(taskStepKeys.detail(stepId), (existing) =>
    existing ? update(existing) : existing,
  );
}
