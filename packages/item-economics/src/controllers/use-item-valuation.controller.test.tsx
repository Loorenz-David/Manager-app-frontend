import type { ReactNode } from "react";

import { ApiRequestError } from "@beyo/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TaskId } from "@beyo/lib";

import { itemEconomicsKeys } from "../api/item-economics-keys";
import { referenceScenario } from "../test-support/price-scenario-reference";
import type { PriceScenario } from "../types";
import { useItemValuationController } from "./use-item-valuation.controller";

const mocks = vi.hoisted(() => ({
  fetchTaskPriceScenario: vi.fn(),
  commitTaskEvaluation: vi.fn(),
  fetchItemLookup: vi.fn(),
  putItemValuation: vi.fn(),
  user: { id: "usr_current" } as { id: string } | null,
}));

vi.mock("../api/fetch-task-price-scenario", () => ({
  fetchTaskPriceScenario: mocks.fetchTaskPriceScenario,
}));

vi.mock("../api/commit-task-evaluation", () => ({
  commitTaskEvaluation: mocks.commitTaskEvaluation,
}));

vi.mock("../api/put-item-valuation", () => ({
  putItemValuation: mocks.putItemValuation,
}));

vi.mock("@beyo/items", () => ({
  fetchItemLookup: mocks.fetchItemLookup,
}));

vi.mock("@beyo/auth", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock("@beyo/lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@beyo/lib")>();
  return {
    ...actual,
    notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  };
});

const TASK_ID = "tsk_ref0001" as TaskId;

/** sv-SE groups with U+00A0, never an ASCII space (projection L7). */
function grouped(value: string): string {
  return value.replace(/ /g, "\u00a0");
}

const EXACT_COMMIT = {
  client_id: "ice_ref0001",
  production_budget_minor: 188100,
  allowed_worker_minutes: "144.69",
};

async function renderController() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  const view = renderHook(() => useItemValuationController(TASK_ID), {
    wrapper: Wrapper,
  });

  await waitFor(() =>
    expect(view.result.current.screenState).not.toBe("loading"),
  );

  return { ...view, queryClient };
}

/**
 * Re-stamp the cached payload's age. `dataUpdatedAt` is what M10's 60 s gate
 * reads, and stamping it directly is the only way to age a fetch without
 * running a clock through TanStack's internals.
 */
function ageCache(
  queryClient: QueryClient,
  scenario: PriceScenario,
  ageMs: number,
): void {
  act(() => {
    queryClient.setQueryData(itemEconomicsKeys.priceScenario(TASK_ID), scenario, {
      updatedAt: Date.now() - ageMs,
    });
  });
}

/**
 * Holds the commit open so the fetch count can be read at the exact moment the
 * commit fires — after that, the action's own invalidation refetches and the
 * count stops answering "did the press refetch first?".
 */
function deferCommit(): { release: () => void } {
  let resolveCommit: (() => void) | null = null;

  mocks.commitTaskEvaluation.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveCommit = () => resolve(EXACT_COMMIT);
      }),
  );

  return {
    release: () => resolveCommit?.(),
  };
}

function pressSave(view: Awaited<ReturnType<typeof renderController>>): void {
  const footer = view.result.current.footer;
  expect(footer).not.toBeNull();
  footer?.onSavePress();
}

describe("useItemValuationController — the M10 staleness guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: "usr_current" };
    mocks.fetchTaskPriceScenario.mockResolvedValue(referenceScenario());
    mocks.commitTaskEvaluation.mockResolvedValue(EXACT_COMMIT);
  });

  it("12. a stale payload refetches first, then commits on the fresh one", async () => {
    const view = await renderController();

    // Move the draft off the saved price so Save is even enabled.
    act(() => view.result.current.slider?.onFractionChange(1));
    ageCache(view.queryClient, referenceScenario(), 61_000);

    expect(mocks.fetchTaskPriceScenario).toHaveBeenCalledTimes(1);

    const commitGate = deferCommit();

    await act(async () => {
      pressSave(view);
    });

    await waitFor(() =>
      expect(mocks.commitTaskEvaluation).toHaveBeenCalledTimes(1),
    );
    // Exactly one extra fetch — the pre-commit one — measured while the commit
    // is still in flight, before its own invalidation can refetch.
    expect(mocks.fetchTaskPriceScenario).toHaveBeenCalledTimes(2);

    await act(async () => {
      commitGate.release();
    });
  });

  it("13. a fresh payload that can no longer commit aborts with its reason and never commits", async () => {
    const view = await renderController();

    act(() => view.result.current.slider?.onFractionChange(1));

    const refused = referenceScenario();
    refused.can_commit = false;
    refused.status = "item_unvalued";
    mocks.fetchTaskPriceScenario.mockResolvedValueOnce(refused);

    ageCache(view.queryClient, referenceScenario(), 61_000);

    await act(async () => {
      pressSave(view);
    });

    expect(mocks.commitTaskEvaluation).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(view.result.current.footer?.saveReason).toBe(
        "Price the item first — fetch its purchase price.",
      ),
    );
  });

  it("13b. a failed pre-commit refetch aborts the save", async () => {
    const view = await renderController();

    act(() => view.result.current.slider?.onFractionChange(1));

    // A 404 is terminal for this query, so the failure lands without waiting
    // out a retry — the abort path is what is under test, not the retry policy.
    mocks.fetchTaskPriceScenario.mockRejectedValueOnce(
      new ApiRequestError(404, "not_found", "This task no longer exists."),
    );
    ageCache(view.queryClient, referenceScenario(), 61_000);

    await act(async () => {
      pressSave(view);
    });

    expect(mocks.commitTaskEvaluation).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(view.result.current.footer?.saveReason).toBe(
        "The latest numbers could not be loaded, so nothing was saved. Try again.",
      ),
    );
  });

  it("14. a fresh payload commits immediately with no extra fetch", async () => {
    const view = await renderController();

    act(() => view.result.current.slider?.onFractionChange(1));
    ageCache(view.queryClient, referenceScenario(), 10_000);

    const commitGate = deferCommit();

    await act(async () => {
      pressSave(view);
    });

    await waitFor(() =>
      expect(mocks.commitTaskEvaluation).toHaveBeenCalledTimes(1),
    );
    // Still one fetch: the press went straight to the commit.
    expect(mocks.fetchTaskPriceScenario).toHaveBeenCalledTimes(1);

    await act(async () => {
      commitGate.release();
    });
  });

  it("15. a double press while the commit is in flight produces one commit", async () => {
    const commitGate = deferCommit();

    const view = await renderController();

    act(() => view.result.current.slider?.onFractionChange(1));
    ageCache(view.queryClient, referenceScenario(), 10_000);

    await act(async () => {
      pressSave(view);
      pressSave(view);
    });

    expect(mocks.commitTaskEvaluation).toHaveBeenCalledTimes(1);

    await act(async () => {
      commitGate.release();
    });

    expect(mocks.commitTaskEvaluation).toHaveBeenCalledTimes(1);
  });
});

describe("useItemValuationController — the draft machine through the real reducer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: "usr_current" };
    mocks.fetchTaskPriceScenario.mockResolvedValue(referenceScenario());
    mocks.commitTaskEvaluation.mockResolvedValue(EXACT_COMMIT);
  });

  it("initialises the draft from the saved expected price (T1)", async () => {
    const view = await renderController();

    expect(view.result.current.screenState).toBe("editor");
    // 855 000 ÷ (100 × 6) = 1 425 exactly.
    expect(view.result.current.headline?.perPiece).toBe(grouped("1 425"));
    expect(view.result.current.footer?.isSaveDisabled).toBe(true);
    expect(view.result.current.provenance?.backLabel).toBeNull();
  });

  it("8b. a successful save clears lastDraft, so the Back button goes away (T6)", async () => {
    const view = await renderController();

    // Drag away, go Back (T4 remembers the abandoned draft), and confirm the
    // toggle now points at it.
    act(() => view.result.current.slider?.onFractionChange(1));
    act(() => view.result.current.provenance?.onBackPress?.());
    expect(view.result.current.provenance?.backLabel).toBe(`Back to ${grouped("2 750")}`);

    // Drag again so Save is enabled, then save; the refetch lands the new price.
    act(() => view.result.current.slider?.onFractionChange(0));
    const saved = referenceScenario();
    saved.saved = { ...saved.saved!, expected_sale_price_minor: 420000 };
    mocks.fetchTaskPriceScenario.mockResolvedValue(saved);

    await act(async () => {
      pressSave(view);
    });

    await waitFor(() =>
      expect(view.result.current.provenance?.backLabel).toBeNull(),
    );
    expect(view.result.current.footer?.isSaveDisabled).toBe(true);
  });

  it("adopts another manager's price while the screen is pristine (T8)", async () => {
    const view = await renderController();

    const moved = referenceScenario();
    moved.saved = { ...moved.saved!, expected_sale_price_minor: 900000 };
    mocks.fetchTaskPriceScenario.mockResolvedValue(moved);

    await act(async () => {
      await view.result.current.refetch();
    });

    // 900 000 ÷ 600 = 1 500.
    await waitFor(() =>
      expect(view.result.current.headline?.perPiece).toBe(grouped("1 500")),
    );
  });

  it("keeps a dirty draft when the saved price moves underneath it (T9)", async () => {
    const view = await renderController();

    act(() => view.result.current.slider?.onFractionChange(1));
    expect(view.result.current.headline?.perPiece).toBe(grouped("2 750"));

    const moved = referenceScenario();
    moved.saved = { ...moved.saved!, expected_sale_price_minor: 900000 };
    mocks.fetchTaskPriceScenario.mockResolvedValue(moved);

    await act(async () => {
      await view.result.current.refetch();
    });

    await waitFor(() =>
      expect(view.result.current.provenance?.backLabel).toBe(
        `Back to ${grouped("1 500")}`,
      ),
    );
    // The user's own number survived the refetch untouched (T9).
    expect(view.result.current.headline?.perPiece).toBe(grouped("2 750"));
  });
});

/**
 * 22f — the §3.5 provenance mapping, one row per case, including the avatar
 * slot the r2 reviewer found unasserted.
 */
describe("useItemValuationController — provenance composition (22f)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchTaskPriceScenario.mockResolvedValue(referenceScenario());
  });

  afterEach(() => {
    mocks.user = { id: "usr_current" };
  });

  it("(i) the signed-in user's own save reads \"You\"", async () => {
    mocks.user = { id: "usr_ref0001" };

    const view = await renderController();

    expect(view.result.current.provenance).toMatchObject({
      avatarKind: "user",
      avatarName: "You",
      label: "You",
    });
    // Owner copy round (2026-08-20): "version · <relative>".
    expect(view.result.current.provenance?.detail).toMatch(/^version · /);
  });

  it("(ii) another user's save reads their name and passes the avatar image through", async () => {
    mocks.user = { id: "usr_current" };
    const withAvatar = referenceScenario();
    withAvatar.saved = {
      ...withAvatar.saved!,
      created_by: {
        client_id: "usr_ref0001",
        username: "Marta Lind",
        profile_picture: "https://example.test/profiles/marta.jpg",
      },
    };
    mocks.fetchTaskPriceScenario.mockResolvedValue(withAvatar);

    const view = await renderController();

    expect(view.result.current.provenance).toMatchObject({
      avatarKind: "user",
      avatarName: "Marta Lind",
      label: "Marta Lind",
      avatarImageSrc: "https://example.test/profiles/marta.jpg",
    });
  });

  it("(iii) an unloadable author reads \"version\" with no detail and an empty avatar name", async () => {
    const anonymous = referenceScenario();
    anonymous.saved = { ...anonymous.saved!, created_by: null };
    mocks.fetchTaskPriceScenario.mockResolvedValue(anonymous);

    const view = await renderController();

    expect(view.result.current.provenance).toMatchObject({
      avatarKind: "user",
      avatarName: "",
      label: "version",
      detail: null,
    });
  });

  it("(iv) a dirty draft is always attributed to the current user", async () => {
    const view = await renderController();

    act(() => view.result.current.slider?.onFractionChange(1));

    expect(view.result.current.provenance).toMatchObject({
      avatarKind: "user",
      label: "You",
    });
    // Owner copy round (2026-08-20): plain "unsaved", no timestamp.
    expect(view.result.current.provenance?.detail).toBe("unsaved");
  });

  it("(v) an unpriced item shows the dash avatar and the ×4 explanation", async () => {
    const unpriced = referenceScenario();
    unpriced.status = "item_missing_expected_price";
    unpriced.saved = {
      ...unpriced.saved!,
      expected_sale_price_minor: null,
      purchase_cost_minor: 285000,
    };
    mocks.fetchTaskPriceScenario.mockResolvedValue(unpriced);

    const view = await renderController();

    expect(view.result.current.provenance).toMatchObject({
      avatarKind: "dash",
      label: "No price set",
      detail: "suggested from purchase price × 4",
      backLabel: null,
    });
    // 285 000 × 4 = 1 140 000, already on the grid → 1 900 per piece.
    expect(view.result.current.headline?.perPiece).toBe(grouped("1 900"));
  });
});
