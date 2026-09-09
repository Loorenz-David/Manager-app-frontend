import { TASK_DEFAULT_LIST_EXCLUDED_STATES } from "../types";
import type { ListTasksFullParams, TaskState, TaskTypeFilter } from "../types";
import { resolveTaskListOrderBy } from "./task-state-filter";

export type TaskListParamsInput = {
  taskType: TaskTypeFilter;
  taskStates: readonly TaskState[];
  /** Already debounced by the caller. */
  q: string;
  itemPosition: string;
  groupByUpholstery: boolean;
};

/**
 * Builds the query params for the tasks list from the user's filter selection.
 *
 * Pure so the interactions between `order_by`, `not_task_states` and
 * `group_by_upholstery` are testable without React, a store, or a network mock.
 */
export function buildTaskListParams({
  taskType,
  taskStates,
  q,
  itemPosition,
  groupByUpholstery,
}: TaskListParamsInput): Omit<ListTasksFullParams, "limit" | "offset"> {
  const orderBy = resolveTaskListOrderBy(taskStates);

  return {
    ...(taskType !== "all" ? { task_types: taskType } : {}),
    ...(taskStates.length > 0 ? { task_states: taskStates.join(",") } : {}),
    ...(q ? { q } : {}),
    ...(itemPosition ? { item_position: itemPosition } : {}),
    ...(groupByUpholstery ? { group_by_upholstery: true } : {}),
    ...(orderBy ? { order_by: orderBy } : {}),
    // Unfiltered, unsearched list hides completed and closed-out work. Any
    // explicit state pill or search term means the user asked for it.
    ...(taskStates.length === 0 && !q
      ? { not_task_states: TASK_DEFAULT_LIST_EXCLUDED_STATES.join(",") }
      : {}),
  };
}
