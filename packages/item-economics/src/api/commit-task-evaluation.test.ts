import type { TaskId } from "@beyo/lib";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { commitTaskEvaluation } from "./commit-task-evaluation";

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("@beyo/api-client", () => ({
  apiClient: { post: mocks.post },
  ApiRequestError: class ApiRequestError extends Error {},
}));

const TASK_ID = "tsk_ref0001" as TaskId;

function fulfil(evaluation: Record<string, unknown>) {
  mocks.post.mockImplementation(
    async (_path: string, schema: { parse: (input: unknown) => unknown }) =>
      schema.parse({ ok: true, warnings: [], data: { evaluation } }),
  );
}

describe("commitTaskEvaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts only the expected sale price to the commit path", async () => {
    fulfil({
      client_id: "ice_ref0001",
      production_budget_minor: 188100,
      allowed_worker_minutes: "144.69",
      // The endpoint returns far more than this; the schema reads three fields.
      currency: "swedish_krona",
      terms: [],
    });

    const evaluation = await commitTaskEvaluation(TASK_ID, {
      expected_sale_price_minor: 855000,
    });

    expect(mocks.post.mock.calls[0]?.[0]).toBe(
      "/api/v1/item-economics/tasks/tsk_ref0001/evaluations/commit",
    );
    // No currency, no purchase cost, no label — operational handoff §4.1.
    expect(mocks.post.mock.calls[0]?.[2]).toEqual({
      expected_sale_price_minor: 855000,
    });
    expect(evaluation.production_budget_minor).toBe(188100);
    expect(evaluation.allowed_worker_minutes).toBe("144.69");
  });

  it("keeps allowed_worker_minutes a string — a number would have been parsed as a float", async () => {
    fulfil({
      client_id: "ice_ref0001",
      production_budget_minor: 188100,
      allowed_worker_minutes: 144.69,
    });

    await expect(
      commitTaskEvaluation(TASK_ID, { expected_sale_price_minor: 855000 }),
    ).rejects.toThrow();
  });
});
