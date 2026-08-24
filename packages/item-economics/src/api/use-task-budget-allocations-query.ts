import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { TaskId, TaskStepId } from "@beyo/lib";

import { fetchTaskBudgetAllocations } from "./fetch-task-budget-allocations";
import { itemEconomicsKeys } from "./item-economics-keys";
import type { BudgetAllocationStep, TaskBudgetAllocation } from "../types";

export type TaskBudgetAllocationsSnapshot = {
  allocations: TaskBudgetAllocation[];
  /**
   * Wall-clock receipt time, stamped in the queryFn so it travels with the
   * payload (and with a keepPreviousData placeholder). This is the client's
   * smoothing baseline: elapsed time may be added on top of the served
   * worked/left values from this moment, and the baseline resets to the
   * served value on every receipt (live-clock handoff §5).
   */
  receivedAtMs: number;
};

export function useTaskBudgetAllocationsQuery(taskIds: TaskId[]) {
  // Deduped and sorted so pagination order and page growth don't churn the
  // query key beyond actual membership changes.
  const normalizedIds = useMemo(
    () => Array.from(new Set(taskIds)).sort(),
    [taskIds],
  );

  return useQuery({
    queryKey: itemEconomicsKeys.taskBudgetAllocations(normalizedIds),
    queryFn: async (): Promise<TaskBudgetAllocationsSnapshot> => ({
      allocations: await fetchTaskBudgetAllocations(normalizedIds),
      receivedAtMs: Date.now(),
    }),
    enabled: normalizedIds.length > 0,
    // Live operational projection, same polling window as production time;
    // TanStack pauses the interval in hidden tabs.
    refetchInterval: 45_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * One row per non-deleted step of each task, `step_id` unique across the
 * response — so a per-step card lookup is a flat map.
 */
export function buildStepBudgetMap(
  allocations: TaskBudgetAllocation[] | undefined,
): Map<TaskStepId, BudgetAllocationStep> {
  const map = new Map<TaskStepId, BudgetAllocationStep>();

  for (const allocation of allocations ?? []) {
    for (const step of allocation.steps) {
      map.set(step.step_id as TaskStepId, step);
    }
  }

  return map;
}

/**
 * `task_id` unique across the response — a per-task card lookup is a flat
 * map, same shape as `buildStepBudgetMap` one level up.
 */
export function buildTaskBudgetAllocationMap(
  allocations: TaskBudgetAllocation[] | undefined,
): Map<TaskId, TaskBudgetAllocation> {
  const map = new Map<TaskId, TaskBudgetAllocation>();

  for (const allocation of allocations ?? []) {
    map.set(allocation.task_id as TaskId, allocation);
  }

  return map;
}
