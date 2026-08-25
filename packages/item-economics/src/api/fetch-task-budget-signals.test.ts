import type { TaskId } from "@beyo/lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchTaskBudgetSignals,
  parseTaskBudgetSignals,
} from "./fetch-task-budget-signals";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@beyo/api-client", () => ({ apiClient: { get: mocks.get } }));

const signal = (overrides: Record<string, unknown> = {}) => ({
  task_id: "tsk_one",
  budget_state: "within_budget",
  over_seconds: 0,
  over_cost_minor: 0,
  projected_over_seconds: 0,
  projected_over_cost_minor: 0,
  currency: "swedish_krona",
  allowed_seconds: 3_000,
  actual_worked_seconds: 2_000,
  cost_per_worker_minute_ten_thousandths: 37_500,
  ...overrides,
});

describe("parseTaskBudgetSignals", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it.each(["no_budget", "over", "projected_over", "within_budget"]) (
    "accepts the %s state",
    (budget_state) => {
      expect(parseTaskBudgetSignals([signal({ budget_state })])).toHaveLength(1);
    },
  );

  it("rejects an unrecognised state without losing sound rows", () => {
    expect(
      parseTaskBudgetSignals([signal(), signal({ task_id: "bad", budget_state: "later" })]),
    ).toHaveLength(1);
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe("fetchTaskBudgetSignals", () => {
  afterEach(() => vi.resetAllMocks());

  it("uses repeated task_ids on the specialised endpoint", async () => {
    mocks.get.mockResolvedValue({ data: { budget_signals: [signal()] } });

    await fetchTaskBudgetSignals(["tsk_one", "tsk_two"] as TaskId[]);

    expect(mocks.get.mock.calls[0]?.[0]).toBe(
      "/api/v1/item-economics/tasks/budget-signals?task_ids=tsk_one&task_ids=tsk_two",
    );
  });
});
