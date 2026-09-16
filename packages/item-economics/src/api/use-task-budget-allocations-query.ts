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

/**
 * TEMPORARY diagnostic (batch pause bug). For every step that is working or
 * was working at the previous payload, prints how many seconds the SERVER
 * credited it since that payload, against how many seconds actually passed.
 *
 * `rate` is the ratio. A single running step should sit at ~1.00. If several
 * steps run at once and the server averages by concurrency, each one accrues
 * at ~1/N while the client's timer counts a full second per second — which
 * would make every one of them snap down on pause.
 */
const lastServed = new Map<string, { worked: number; atMs: number }>();

function logServedAccrualRates(
  allocations: { steps: { step_id: string; state: string; worked_seconds: number }[] }[],
  receivedAtMs: number,
): void {
  const rows: Record<string, unknown>[] = [];

  for (const allocation of allocations) {
    for (const step of allocation.steps) {
      const previous = lastServed.get(step.step_id);
      const isRelevant = step.state === "working" || step.state === "paused";
      if (!isRelevant && !previous) {
        continue;
      }

      if (previous && (step.state === "working" || previous.worked !== step.worked_seconds)) {
        const elapsedSec = (receivedAtMs - previous.atMs) / 1000;
        const creditedSec = step.worked_seconds - previous.worked;
        rows.push({
          id: step.step_id.slice(-6),
          state: step.state,
          worked: step.worked_seconds,
          credited: creditedSec,
          elapsed: Math.round(elapsedSec),
          rate: elapsedSec > 0 ? (creditedSec / elapsedSec).toFixed(2) : "n/a",
        });
      }

      if (isRelevant) {
        lastServed.set(step.step_id, {
          worked: step.worked_seconds,
          atMs: receivedAtMs,
        });
      } else {
        lastServed.delete(step.step_id);
      }
    }
  }

  if (rows.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[step-clock ${new Date(receivedAtMs).toISOString().slice(11, 23)}] served-rate`,
      JSON.stringify(rows),
    );
  }
}

export function useTaskBudgetAllocationsQuery(taskIds: TaskId[]) {
  // Deduped and sorted so pagination order and page growth don't churn the
  // query key beyond actual membership changes.
  const normalizedIds = useMemo(
    () => Array.from(new Set(taskIds)).sort(),
    [taskIds],
  );

  return useQuery({
    queryKey: itemEconomicsKeys.taskBudgetAllocations(normalizedIds),
    queryFn: async (): Promise<TaskBudgetAllocationsSnapshot> => {
      const allocations = await fetchTaskBudgetAllocations(normalizedIds);
      const receivedAtMs = Date.now();
      // TEMPORARY diagnostic (batch pause bug) — remove with its siblings.
      logServedAccrualRates(allocations, receivedAtMs);
      return { allocations, receivedAtMs };
    },
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
