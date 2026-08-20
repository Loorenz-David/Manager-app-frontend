import { notify } from "@beyo/lib";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { itemEconomicsKeys } from "./api/item-economics-keys";
import { itemEconomicsSocketEvents } from "./socket-events";

const SCENARIO_BRANCH = [...itemEconomicsKeys.all, "price-scenario"];

/** Just the shape these helpers read — `vi.spyOn`'s own type is too narrow to pass around. */
type InvalidateSpy = { mock: { calls: unknown[][] } };

function keysOf(invalidate: InvalidateSpy): string[] {
  return invalidate.mock.calls.map((call) =>
    JSON.stringify((call[0] as { queryKey?: unknown } | undefined)?.queryKey),
  );
}

function countKey(invalidate: InvalidateSpy, key: readonly unknown[]): number {
  const serialized = JSON.stringify(key);
  return keysOf(invalidate).filter((entry) => entry === serialized).length;
}

describe("itemEconomicsSocketEvents", () => {
  it("invalidates the broad task branch for step state changes", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    itemEconomicsSocketEvents["task:step-state-changed"]?.(
      [{ client_id: "tsp_step", new_state: "working" }],
      { queryClient, notify },
    );

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: itemEconomicsKeys.tasks(),
      refetchType: "active",
    });
  });

  it("invalidates one task production-time key after evaluation commit", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    itemEconomicsSocketEvents["item_economics:evaluation-committed"]?.(
      { client_id: "tsk_task", evaluation_id: "ice_evaluation" },
      { queryClient, notify },
    );

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["item-economics", "task", "tsk_task", "production-time"],
      refetchType: "active",
    });
  });

  // 18 — the adjacent pair: the extension must not have cost the old handler
  // its behaviour, so both keys are asserted on the same event.
  it("18. also invalidates the scenario key after evaluation commit", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    itemEconomicsSocketEvents["item_economics:evaluation-committed"]?.(
      { client_id: "tsk_task", evaluation_id: "ice_evaluation" },
      { queryClient, notify },
    );

    expect(
      countKey(invalidate, itemEconomicsKeys.taskProductionTime("tsk_task" as never)),
    ).toBe(1);
    expect(
      countKey(invalidate, itemEconomicsKeys.priceScenario("tsk_task" as never)),
    ).toBe(1);
  });

  it("18b. invalidates the scenario branch immediately on item:updated", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    itemEconomicsSocketEvents["item:updated"]?.(
      { client_id: "itm_ref0001" },
      { queryClient, notify },
    );

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: SCENARIO_BRANCH,
      refetchType: "active",
    });
  });
});

/**
 * The M9 debounce. The timer is module-scope by contract, so every case resets
 * modules first — otherwise a pending timer from the previous test fires inside
 * the next one and the counts stop meaning anything.
 */
describe("itemEconomicsSocketEvents — the 12 s trailing refetch (M9)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function loadHandlers() {
    return (await import("./socket-events")).itemEconomicsSocketEvents;
  }

  it("16. five events one second apart produce zero refetches before the trailing edge and exactly one after", async () => {
    const handlers = await loadHandlers();
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    for (let index = 0; index < 5; index += 1) {
      handlers["task:step-state-changed"]?.(
        [{ client_id: `tsp_${index}`, new_state: "working" }],
        { queryClient, notify },
      );
      vi.advanceTimersByTime(1000);
    }

    // The loop leaves 1 s already elapsed of the last event's 12 s window.
    expect(countKey(invalidate, SCENARIO_BRANCH)).toBe(0);

    vi.advanceTimersByTime(10_999);
    expect(countKey(invalidate, SCENARIO_BRANCH)).toBe(0);

    vi.advanceTimersByTime(1);
    expect(countKey(invalidate, SCENARIO_BRANCH)).toBe(1);

    // No max-wait, no second fire: the window is quiet now.
    vi.advanceTimersByTime(60_000);
    expect(countKey(invalidate, SCENARIO_BRANCH)).toBe(1);
  });

  it("16b. every step event still invalidates the task branch immediately", async () => {
    const handlers = await loadHandlers();
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    for (let index = 0; index < 3; index += 1) {
      handlers["task:step-state-changed"]?.(
        [{ client_id: `tsp_${index}`, new_state: "working" }],
        { queryClient, notify },
      );
    }

    expect(countKey(invalidate, itemEconomicsKeys.tasks())).toBe(3);
    expect(countKey(invalidate, SCENARIO_BRANCH)).toBe(0);
  });

  it("16c. the trailing fire uses the most recent event's query client", async () => {
    const handlers = await loadHandlers();
    const firstClient = new QueryClient();
    const latestClient = new QueryClient();
    const firstInvalidate = vi.spyOn(firstClient, "invalidateQueries");
    const latestInvalidate = vi.spyOn(latestClient, "invalidateQueries");

    handlers["task:step-state-changed"]?.(
      [{ client_id: "tsp_1", new_state: "working" }],
      { queryClient: firstClient, notify },
    );
    vi.advanceTimersByTime(2000);
    handlers["task:step-state-changed"]?.(
      [{ client_id: "tsp_2", new_state: "working" }],
      { queryClient: latestClient, notify },
    );
    vi.advanceTimersByTime(12_000);

    expect(countKey(firstInvalidate, SCENARIO_BRANCH)).toBe(0);
    expect(countKey(latestInvalidate, SCENARIO_BRANCH)).toBe(1);
  });
});

describe("the scenario branch root", () => {
  it("17b. is a prefix of the per-task key and not of the tasks() branch", () => {
    const scenarioKey = itemEconomicsKeys.priceScenario("tsk_task" as never);

    expect(scenarioKey.slice(0, SCENARIO_BRANCH.length)).toEqual(
      SCENARIO_BRANCH,
    );
    expect(SCENARIO_BRANCH).not.toEqual(
      expect.arrayContaining(["task"] as never[]),
    );
  });
});
