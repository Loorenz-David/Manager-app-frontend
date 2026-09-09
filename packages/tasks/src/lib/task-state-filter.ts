import { TASK_COMPLETION_FILTER_STATES } from "../types";
import type { TaskState } from "../types";

/**
 * `order_by` key that sorts a completed cohort newest-first. The backend
 * silently ignores it — 200, default ordering, no warning — unless
 * `task_states` contains `ready` and/or `resolved`, so it must never be sent
 * for a selection that is not entirely completion states.
 */
export const TASK_RECENTLY_COMPLETED_ORDER_BY = "recently_completed";

export function isTaskCompletionFilterState(state: TaskState): boolean {
  return (TASK_COMPLETION_FILTER_STATES as readonly string[]).includes(state);
}

/**
 * Applies the completion-cohort exclusivity rule to a state-filter selection.
 *
 * `BoxPicker` hands back an already-toggled array, so the value the user just
 * pressed is recovered by diffing against the previous selection. Adding a
 * completion state clears every other state; adding any other state clears the
 * completion states. `ready` and `resolved` may be selected together.
 * Deselections pass through untouched, so dropping `resolved` out of the pair
 * leaves `["ready"]` rather than clearing both.
 *
 * The list is therefore always one cohort or the other, never mixed — which is
 * what makes the completion sort meaningful for every row on screen.
 */
export function resolveTaskStateSelection(
  previous: readonly TaskState[],
  next: readonly TaskState[],
): TaskState[] {
  const added = next.filter((state) => !previous.includes(state));

  if (added.length === 0) {
    return [...next];
  }

  return added.some(isTaskCompletionFilterState)
    ? next.filter(isTaskCompletionFilterState)
    : next.filter((state) => !isTaskCompletionFilterState(state));
}

/**
 * The `order_by` for a state selection, or undefined to leave the backend on
 * its default ordering.
 *
 * Requires *every* selected state to be a completion state, not merely one:
 * `resolveTaskStateSelection` already makes a mixed selection unreachable
 * through the pills, so this is the second line of defence against sorting a
 * list whose rows mostly carry a null `completed_at`.
 */
export function resolveTaskListOrderBy(
  taskStates: readonly TaskState[],
): string | undefined {
  if (taskStates.length === 0) {
    return undefined;
  }
  return taskStates.every(isTaskCompletionFilterState)
    ? TASK_RECENTLY_COMPLETED_ORDER_BY
    : undefined;
}
