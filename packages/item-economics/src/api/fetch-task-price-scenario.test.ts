import type { TaskId } from "@beyo/lib";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PRICE_SCENARIO_REFERENCE_JSON } from "../test-support/price-scenario-reference";
import { fetchTaskPriceScenario } from "./fetch-task-price-scenario";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@beyo/api-client", () => ({
  apiClient: { get: mocks.get },
  ApiRequestError: class ApiRequestError extends Error {},
}));

const TASK_ID = "tsk_ref0001" as TaskId;

function envelope(data: unknown) {
  return { ok: true, warnings: [], data };
}

describe("fetchTaskPriceScenario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the task-scoped price-scenario path under the item-economics base", async () => {
    mocks.get.mockImplementation(
      async (_path: string, schema: { parse: (input: unknown) => unknown }) =>
        schema.parse(envelope(PRICE_SCENARIO_REFERENCE_JSON)),
    );

    const scenario = await fetchTaskPriceScenario(TASK_ID);

    expect(mocks.get.mock.calls[0]?.[0]).toBe(
      "/api/v1/item-economics/tasks/tsk_ref0001/price-scenario",
    );
    expect(scenario.saved?.expected_sale_price_minor).toBe(855000);
  });

  it("unwraps the envelope and rejects a payload from another calculation version", async () => {
    mocks.get.mockImplementation(
      async (_path: string, schema: { parse: (input: unknown) => unknown }) =>
        schema.parse(
          envelope({ ...PRICE_SCENARIO_REFERENCE_JSON, calculation_version: 2 }),
        ),
    );

    await expect(fetchTaskPriceScenario(TASK_ID)).rejects.toThrow();
  });
});
