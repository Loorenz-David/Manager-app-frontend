import type { TaskId } from "@beyo/lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchTaskBudgetAllocations,
  parseBudgetAllocations,
} from "./fetch-task-budget-allocations";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@beyo/api-client", () => ({
  apiClient: { get: mocks.get },
  ApiRequestError: class ApiRequestError extends Error {},
}));

function step(overrides: Record<string, unknown> = {}) {
  return {
    step_id: "tstp_one",
    working_section_id: "wsec_weaving",
    section_name_snapshot: "weaving",
    typical_worker_seconds: null,
    typical_basis: "insufficient_sample",
    sample_count: 0,
    allowance_seconds: 2210,
    worked_seconds: 0,
    left_seconds: 2210,
    share_state: "on_track",
    ...overrides,
  };
}

function typicalResolution(overrides: Record<string, unknown> = {}) {
  return {
    task_typical_basis: "item_narrowed_uniform",
    reconciliation_method: "uniform_basis_v1",
    comparability_profile: "primary_item_category_v1",
    applied_filter: { item_category_ids: ["icat_chair"] },
    participating_section_count: 5,
    sections_by_basis: {
      item_narrowed: 4,
      section_wide: 1,
      insufficient_sample: 0,
    },
    ...overrides,
  };
}

function allocation(overrides: Record<string, unknown> = {}) {
  return {
    task_id: "tsk_one",
    status: "ok",
    allowed_worker_minutes: "276.48",
    actual_worker_seconds: 14_919,
    remaining_worker_minutes: "27.83",
    allocation_method: "static_proportional_section_v2",
    typical_resolution: typicalResolution(),
    steps: [step()],
    ...overrides,
  };
}

describe("parseBudgetAllocations", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("accepts the null actual_worker_seconds an unevaluated task really sends", () => {
    // The handoff's §5 table calls this field never-null; the query sets it to
    // None for any status outside the budget set. Reality wins.
    const parsed = parseBudgetAllocations([
      allocation({
        status: "not_evaluated",
        allowed_worker_minutes: null,
        actual_worker_seconds: null,
        remaining_worker_minutes: null,
        steps: [
          step({
            allowance_seconds: null,
            left_seconds: null,
            share_state: "no_budget",
          }),
        ],
      }),
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.actual_worker_seconds).toBeNull();
  });

  it("keeps the sound rows when one task's shape is unrecognised", () => {
    // The whole point: a contract drift costs one task its figures, not every
    // card on the screen its budget line.
    const parsed = parseBudgetAllocations([
      allocation({ task_id: "tsk_good" }),
      allocation({ task_id: "tsk_bad", steps: [step({ worked_seconds: null })] }),
      allocation({ task_id: "tsk_also_good" }),
    ]);

    expect(parsed.map((row) => row.task_id)).toEqual([
      "tsk_good",
      "tsk_also_good",
    ]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("names the offending task in the warning so the drift is traceable", () => {
    parseBudgetAllocations([allocation({ task_id: "tsk_bad", status: "wat" })]);

    expect(warn.mock.calls[0]?.[1]).toMatchObject([{ taskId: "tsk_bad" }]);
  });

  it("tolerates an unknown key, so the next additive release lands safely", () => {
    const parsed = parseBudgetAllocations([
      allocation({ some_field_shipped_after_this_test: true }),
    ]);

    expect(parsed).toHaveLength(1);
  });

  it("reads the item-aware provenance the v2 release publishes", () => {
    const parsed = parseBudgetAllocations([
      allocation({
        steps: [
          step({
            typical_worker_seconds: 2_877,
            typical_basis: "item_narrowed",
            sample_count: 14,
          }),
        ],
      }),
    ]);

    expect(parsed[0]?.steps[0]).toMatchObject({
      typical_basis: "item_narrowed",
      sample_count: 14,
    });
    expect(parsed[0]?.typical_resolution.applied_filter).toEqual({
      item_category_ids: ["icat_chair"],
    });
  });

  it("keeps a zero typical as a statistic rather than missing data", () => {
    // §4: `section_wide` beside 0 is reachable and is a real answer. The
    // unreachable form is `item_narrowed` beside 0.
    const parsed = parseBudgetAllocations([
      allocation({
        steps: [
          step({ typical_worker_seconds: 0, typical_basis: "section_wide" }),
        ],
      }),
    ]);

    expect(parsed[0]?.steps[0]?.typical_worker_seconds).toBe(0);
  });

  it("falls back to the weakest basis rather than failing on an unfamiliar one", () => {
    // A basis we have never seen must make the client less confident about the
    // target, never cost the task its whole row.
    const parsed = parseBudgetAllocations([
      allocation({ steps: [step({ typical_basis: "item_and_upholstery_v9" })] }),
    ]);

    expect(parsed[0]?.steps[0]?.typical_basis).toBe("insufficient_sample");
  });

  it("survives a backend that has not deployed the provenance fields yet", () => {
    // Deploy skew must degrade the provenance, not the budget figures the
    // cards actually render.
    const { typical_resolution: _dropped, ...withoutResolution } = allocation();
    const parsed = parseBudgetAllocations([
      {
        ...withoutResolution,
        steps: [
          {
            step_id: "tstp_one",
            working_section_id: "wsec_weaving",
            section_name_snapshot: "weaving",
            typical_worker_seconds: null,
            allowance_seconds: 2210,
            worked_seconds: 0,
            left_seconds: 2210,
            share_state: "on_track",
          },
        ],
      },
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.steps[0]?.allowance_seconds).toBe(2210);
    expect(parsed[0]?.steps[0]?.typical_basis).toBe("insufficient_sample");
    expect(parsed[0]?.typical_resolution).toEqual({
      task_typical_basis: "section_wide_uniform",
      reconciliation_method: "uniform_basis_v1",
      comparability_profile: "primary_item_category_v1",
      applied_filter: null,
      participating_section_count: 0,
      sections_by_basis: {
        item_narrowed: 0,
        section_wide: 0,
        insufficient_sample: 0,
      },
    });
  });
});

describe("fetchTaskBudgetAllocations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("repeats task_ids rather than sending one joined value", async () => {
    mocks.get.mockImplementation(
      async (_path: string, schema: { parse: (input: unknown) => unknown }) =>
        schema.parse({
          ok: true,
          warnings: [],
          data: { budget_allocations: [allocation()] },
        }),
    );

    await fetchTaskBudgetAllocations(["tsk_one", "tsk_two"] as TaskId[]);

    expect(mocks.get.mock.calls[0]?.[0]).toBe(
      "/api/v1/item-economics/tasks/budget-allocations?task_ids=tsk_one&task_ids=tsk_two",
    );
  });

  it("splits past the backend's fifty-id cap and rejoins the pages", async () => {
    const taskIds = Array.from(
      { length: 51 },
      (_unused, index) => `tsk_${index}`,
    ) as TaskId[];
    mocks.get.mockImplementation(
      async (path: string, schema: { parse: (input: unknown) => unknown }) =>
        schema.parse({
          ok: true,
          warnings: [],
          data: {
            budget_allocations: [allocation({ task_id: `tsk_from_${path.length}` })],
          },
        }),
    );

    const rows = await fetchTaskBudgetAllocations(taskIds);

    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(rows).toHaveLength(2);
  });

  it("asks for nothing when the feed has no tasks", async () => {
    await expect(fetchTaskBudgetAllocations([])).resolves.toEqual([]);
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
