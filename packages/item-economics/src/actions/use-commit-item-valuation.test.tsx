import type { ReactNode } from "react";

import { ApiRequestError } from "@beyo/api-client";
import { notify, type TaskId } from "@beyo/lib";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { itemEconomicsKeys } from "../api/item-economics-keys";
import { referenceScenario } from "../test-support/price-scenario-reference";
import type { PriceScenarioModel } from "../types";
import {
  RECONCILIATION_NOTICE_BODY,
  RECONCILIATION_NOTICE_TITLE,
  resolveCommitErrorMessage,
  useCommitItemValuation,
} from "./use-commit-item-valuation";

const mocks = vi.hoisted(() => ({
  commitTaskEvaluation: vi.fn(),
}));

vi.mock("../api/commit-task-evaluation", () => ({
  commitTaskEvaluation: mocks.commitTaskEvaluation,
}));

vi.mock("@beyo/lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@beyo/lib")>();
  return {
    ...actual,
    notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  };
});

const TASK_ID = "tsk_ref0001" as TaskId;
const MODEL: PriceScenarioModel = referenceScenario().model!;

/** The reference model at 855 000 öre — hand-derived, then re-derived here. */
const PRICE_MINOR = 855000;
const EXACT_BUDGET_MINOR = 188100;
const EXACT_WORKER_MINUTES = "144.69";

function renderCommit(onCommitted?: (reconciled: boolean) => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  const view = renderHook(() => useCommitItemValuation(TASK_ID, onCommitted), {
    wrapper: Wrapper,
  });

  return { ...view, invalidate };
}

/** Just the shape this helper reads — `vi.spyOn`'s own type is too narrow to pass around. */
type InvalidateSpy = { mock: { calls: unknown[][] } };

function scenarioInvalidations(invalidate: InvalidateSpy) {
  const expected = JSON.stringify(itemEconomicsKeys.priceScenario(TASK_ID));
  return invalidate.mock.calls.filter(
    (call) =>
      JSON.stringify(
        (call[0] as { queryKey?: unknown } | undefined)?.queryKey,
      ) === expected,
  );
}

function commitResponse(
  overrides: Partial<{
    production_budget_minor: number;
    allowed_worker_minutes: string;
  }> = {},
) {
  return {
    client_id: "ice_ref0001",
    production_budget_minor: EXACT_BUDGET_MINOR,
    allowed_worker_minutes: EXACT_WORKER_MINUTES,
    ...overrides,
  };
}

async function commitOnce(
  view: ReturnType<typeof renderCommit>,
): Promise<void> {
  await act(async () => {
    await view.result.current.commit({ priceMinor: PRICE_MINOR, model: MODEL });
  });
}

describe("useCommitItemValuation (intention §4A M8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("8. an exact response notifies nothing, refetches once and reports a reconciled commit", async () => {
    mocks.commitTaskEvaluation.mockResolvedValue(commitResponse());
    const onCommitted = vi.fn();

    const view = renderCommit(onCommitted);
    await commitOnce(view);

    expect(mocks.commitTaskEvaluation).toHaveBeenCalledTimes(1);
    expect(mocks.commitTaskEvaluation).toHaveBeenCalledWith(TASK_ID, {
      expected_sale_price_minor: PRICE_MINOR,
    });
    expect(notify.info).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
    expect(scenarioInvalidations(view.invalidate)).toHaveLength(1);
    // T6's trigger: the controller clears `lastDraft` off this verdict.
    expect(onCommitted).toHaveBeenCalledWith(true);
  });

  it("9. one öre off on the budget triggers exactly one refetch and one neutral notice, and never a second commit", async () => {
    mocks.commitTaskEvaluation.mockResolvedValue(
      commitResponse({ production_budget_minor: EXACT_BUDGET_MINOR + 1 }),
    );
    const onCommitted = vi.fn();

    const view = renderCommit(onCommitted);
    await commitOnce(view);

    expect(notify.info).toHaveBeenCalledTimes(1);
    expect(notify.info).toHaveBeenCalledWith(
      RECONCILIATION_NOTICE_TITLE,
      RECONCILIATION_NOTICE_BODY,
    );
    expect(scenarioInvalidations(view.invalidate)).toHaveLength(1);
    expect(mocks.commitTaskEvaluation).toHaveBeenCalledTimes(1);
    expect(onCommitted).toHaveBeenCalledWith(false);
  });

  it("10. a mismatched allowed_worker_minutes string alone takes the same path", async () => {
    mocks.commitTaskEvaluation.mockResolvedValue(
      commitResponse({ allowed_worker_minutes: "144.70" }),
    );

    const view = renderCommit();
    await commitOnce(view);

    expect(notify.info).toHaveBeenCalledTimes(1);
    expect(scenarioInvalidations(view.invalidate)).toHaveLength(1);
    expect(mocks.commitTaskEvaluation).toHaveBeenCalledTimes(1);
  });

  it("10b. a trailing-zero difference is still a mismatch — the comparison is on strings", async () => {
    mocks.commitTaskEvaluation.mockResolvedValue(
      commitResponse({ allowed_worker_minutes: "144.690" }),
    );

    const view = renderCommit();
    await commitOnce(view);

    expect(notify.info).toHaveBeenCalledTimes(1);
  });

  it("11. a 409 concurrent commit refetches and shows its own message", async () => {
    mocks.commitTaskEvaluation.mockRejectedValue(
      new ApiRequestError(
        409,
        "conflict",
        "ITEM_COST_CONCURRENT_COMMIT: someone else committed first",
      ),
    );

    const view = renderCommit();
    await commitOnce(view);

    expect(notify.error).toHaveBeenCalledWith(
      "Could not save",
      "Someone else saved first — showing the latest numbers.",
    );
    expect(scenarioInvalidations(view.invalidate)).toHaveLength(1);
  });

  it("11b. a non-409 refusal shows its message without a refetch", async () => {
    mocks.commitTaskEvaluation.mockRejectedValue(
      new ApiRequestError(
        422,
        "unprocessable",
        "ITEM_COST_TASK_TERMINAL: the task is finished",
      ),
    );

    const view = renderCommit();
    await commitOnce(view);

    expect(notify.error).toHaveBeenCalledWith(
      "Could not save",
      "This task is finished — economics can no longer be committed.",
    );
    expect(scenarioInvalidations(view.invalidate)).toHaveLength(0);
  });
});

/**
 * Criterion 11's identity table — every identity of the operational handoff
 * §4.1, one row each, enumerated rather than sampled. The four rows the handoff
 * marks "→ settings" are the ones that must route the manager there; the fifth
 * `NO_*` identity, `ITEM_COST_NO_PRIMARY_ITEM`, is *not* a settings problem and
 * carries its own copy (see the Review log — the handoff prose says "five" but
 * its own table marks four).
 */
describe("resolveCommitErrorMessage — one row per identity (operational §4.1)", () => {
  const SETTINGS_SUFFIX = "item economics settings.";

  it.each([
    ["ITEM_COST_NO_COST_GROUP", true],
    ["ITEM_COST_AMBIGUOUS_COST_GROUP", true],
    ["ITEM_COST_NO_BASIS_VERSION", true],
    ["ITEM_COST_NO_COST_MODEL_VERSION", true],
  ] as const)("%s routes to the settings screen", (identity, isSettings) => {
    const message = resolveCommitErrorMessage(
      new ApiRequestError(422, "unprocessable", `${identity}: backend sentence`),
    );

    expect(message.endsWith(SETTINGS_SUFFIX)).toBe(isSettings);
  });

  it.each([
    ["ITEM_COST_NO_PRIMARY_ITEM", "This task has no primary item to price."],
    [
      "ITEM_COST_TASK_TERMINAL",
      "This task is finished — economics can no longer be committed.",
    ],
    [
      "ITEM_COST_ITEM_MISSING_MAJOR_CATEGORY",
      "This item has no wood or seat category yet, so it cannot be priced.",
    ],
    [
      "ITEM_COST_ITEM_UNVALUED",
      "Price the item first — fetch its purchase price.",
    ],
    [
      "ITEM_COST_EXPECTED_PRICE_REQUIRED",
      "This item's valuation has no expected sale price yet.",
    ],
    [
      "ITEM_COST_PURCHASE_COST_REQUIRED",
      "The cost model needs a purchase cost and this item has none. Fetch the purchase price first.",
    ],
    [
      "ITEM_COST_CURRENCY_MISMATCH",
      "The item's, basis's and model's currencies disagree. Resolve it in the item economics settings.",
    ],
    [
      "ITEM_COST_CONCURRENT_COMMIT",
      "Someone else saved first — showing the latest numbers.",
    ],
    [
      "ITEM_COST_NO_COST_GROUP",
      "No cost group is configured for this item's category. Set one up in the item economics settings.",
    ],
    [
      "ITEM_COST_AMBIGUOUS_COST_GROUP",
      "More than one active cost group matches this item's category. Resolve it in the item economics settings.",
    ],
    [
      "ITEM_COST_NO_BASIS_VERSION",
      "That cost group has no applicable cost basis. Add one in the item economics settings.",
    ],
    [
      "ITEM_COST_NO_COST_MODEL_VERSION",
      "No applicable cost model was found. Add one in the item economics settings.",
    ],
  ])("%s renders its own copy", (identity, expected) => {
    expect(
      resolveCommitErrorMessage(
        new ApiRequestError(
          422,
          "unprocessable",
          `${identity}: the backend's sentence, which is display copy`,
        ),
      ),
    ).toBe(expected);
  });

  it("falls back to the transport code for an unmapped failure", () => {
    expect(
      resolveCommitErrorMessage(
        new ApiRequestError(503, "network_error", "Gateway unavailable"),
      ),
    ).toBe("Check your connection and try again.");
  });

  it("never leaks a non-API error to the user", () => {
    expect(resolveCommitErrorMessage(new Error("boom"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
