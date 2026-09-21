import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  itemEconomicsKeys,
  type BudgetAllocationStep,
  type TaskBudgetAllocationsSnapshot,
} from "@beyo/item-economics";
import type { TaskId } from "@beyo/lib";

import { seedSettledWorkedSeconds } from "./step-transition-cache";

type Allocation = TaskBudgetAllocationsSnapshot["allocations"][number];

const RECEIVED_AT_MS = Date.parse("2026-09-18T09:00:00.000Z");

function budgetStep(
  stepId: string,
  overrides: Partial<BudgetAllocationStep> = {},
): BudgetAllocationStep {
  return {
    step_id: stepId,
    working_section_id: "wsec_batch",
    section_name_snapshot: "Upholstery Installation",
    typical_worker_seconds: null,
    typical_unit_worker_seconds: null,
    projected_typical_worker_seconds: null,
    typical_basis: "insufficient_sample",
    sample_count: 0,
    allowance_seconds: 3600,
    state: "working",
    pressure_share_seconds: null,
    worked_seconds: 100,
    left_seconds: 3500,
    share_state: "on_track",
    live_accrual_rate: "0.3333",
    live_concurrency: 3,
    ...overrides,
  };
}

// Only the keys the helper reads; the allocation's own budget fields are
// irrelevant to seeding a step row.
function allocation(taskId: string, steps: BudgetAllocationStep[]): Allocation {
  return { task_id: taskId, steps } as unknown as Allocation;
}

function seedSnapshot(
  queryClient: QueryClient,
  taskIds: string[],
  allocations: Allocation[],
): readonly unknown[] {
  const key = itemEconomicsKeys.taskBudgetAllocations(taskIds as TaskId[]);
  queryClient.setQueryData<TaskBudgetAllocationsSnapshot>(key, {
    allocations,
    receivedAtMs: RECEIVED_AT_MS,
  });
  return key;
}

function readSnapshot(
  queryClient: QueryClient,
  key: readonly unknown[],
): TaskBudgetAllocationsSnapshot {
  const data = queryClient.getQueryData<TaskBudgetAllocationsSnapshot>(key);
  if (!data) {
    throw new Error("snapshot missing");
  }
  return data;
}

function rowOf(snapshot: TaskBudgetAllocationsSnapshot, stepId: string) {
  const row = snapshot.allocations
    .flatMap((entry) => entry.steps)
    .find((step) => step.step_id === stepId);
  if (!row) {
    throw new Error(`row ${stepId} missing`);
  }
  return row;
}

describe("seedSettledWorkedSeconds", () => {
  it("writes the settled total and the new state together", () => {
    // The pair must move as one. A row left `working` beside a complete total
    // would have the projection add the run's elapsed time a second time.
    const queryClient = new QueryClient();
    const key = seedSnapshot(queryClient, ["tsk_a"], [
      allocation("tsk_a", [budgetStep("tsp_a")]),
    ]);

    seedSettledWorkedSeconds(queryClient, "tsp_a", "paused", 102);

    const row = rowOf(readSnapshot(queryClient, key), "tsp_a");
    expect(row.worked_seconds).toBe(102);
    expect(row.state).toBe("paused");
  });

  it("moves left_seconds by exactly the same amount", () => {
    const queryClient = new QueryClient();
    const key = seedSnapshot(queryClient, ["tsk_a"], [
      allocation("tsk_a", [budgetStep("tsp_a")]),
    ]);

    seedSettledWorkedSeconds(queryClient, "tsp_a", "paused", 102);

    expect(rowOf(readSnapshot(queryClient, key), "tsp_a").left_seconds).toBe(
      3498,
    );
  });

  it("keeps a step with no allocation free of a countdown", () => {
    const queryClient = new QueryClient();
    const key = seedSnapshot(queryClient, ["tsk_a"], [
      allocation("tsk_a", [
        budgetStep("tsp_a", { left_seconds: null, share_state: "no_budget" }),
      ]),
    ]);

    seedSettledWorkedSeconds(queryClient, "tsp_a", "paused", 102);

    expect(rowOf(readSnapshot(queryClient, key), "tsp_a").left_seconds).toBeNull();
  });

  it("leaves the smoothing baseline and every other step untouched", () => {
    // receivedAtMs anchors every running step in the snapshot. Re-stamping it
    // for one step would silently drop the accrual of all the others.
    const queryClient = new QueryClient();
    const untouched = budgetStep("tsp_b");
    const key = seedSnapshot(queryClient, ["tsk_a", "tsk_b"], [
      allocation("tsk_a", [budgetStep("tsp_a")]),
      allocation("tsk_b", [untouched]),
    ]);

    seedSettledWorkedSeconds(queryClient, "tsp_a", "paused", 102);

    const snapshot = readSnapshot(queryClient, key);
    expect(snapshot.receivedAtMs).toBe(RECEIVED_AT_MS);
    expect(rowOf(snapshot, "tsp_b")).toBe(untouched);
  });

  it("patches the step in every allocations query that holds it", () => {
    // The detail slide runs its own one-task query beside the list's batched
    // one; both render the same step and must agree.
    const queryClient = new QueryClient();
    const detailKey = seedSnapshot(queryClient, ["tsk_a"], [
      allocation("tsk_a", [budgetStep("tsp_a")]),
    ]);
    const listKey = seedSnapshot(queryClient, ["tsk_a", "tsk_b"], [
      allocation("tsk_a", [budgetStep("tsp_a")]),
      allocation("tsk_b", [budgetStep("tsp_b")]),
    ]);

    seedSettledWorkedSeconds(queryClient, "tsp_a", "paused", 102);

    expect(rowOf(readSnapshot(queryClient, detailKey), "tsp_a").worked_seconds).toBe(102);
    expect(rowOf(readSnapshot(queryClient, listKey), "tsp_a").worked_seconds).toBe(102);
  });

  it("leaves a snapshot that does not hold the step as it was", () => {
    const queryClient = new QueryClient();
    const key = seedSnapshot(queryClient, ["tsk_b"], [
      allocation("tsk_b", [budgetStep("tsp_b")]),
    ]);
    const before = readSnapshot(queryClient, key);

    seedSettledWorkedSeconds(queryClient, "tsp_a", "paused", 102);

    expect(readSnapshot(queryClient, key)).toBe(before);
  });
});
