import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TaskId } from "@beyo/lib";

import { itemEconomicsKeys } from "../api/item-economics-keys";
import { referenceScenario } from "../test-support/price-scenario-reference";
import type { PriceScenario } from "../types";
import { useBootstrapPurchasePrice } from "./use-bootstrap-purchase-price";

const mocks = vi.hoisted(() => ({
  fetchItemLookup: vi.fn(),
  putItemValuation: vi.fn(),
}));

vi.mock("@beyo/items", () => ({
  fetchItemLookup: mocks.fetchItemLookup,
}));

vi.mock("../api/put-item-valuation", () => ({
  putItemValuation: mocks.putItemValuation,
}));

const TASK_ID = "tsk_ref0001" as TaskId;

function lookupResult(
  purchasePriceMinor: number | null,
  source = "purchase_api",
) {
  return {
    article_number: "0000608",
    sku: null,
    item_category_id: null,
    quantity: 6,
    external_id: "ext_1",
    external_source: source,
    images: [],
    purchase_price_minor: purchasePriceMinor,
  };
}

function renderBootstrap() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  const view = renderHook(() => useBootstrapPurchasePrice(TASK_ID), {
    wrapper: Wrapper,
  });

  return { ...view, invalidate };
}

/** The PUT body of the most recent `putItemValuation` call. */
function lastPutBody(): Record<string, unknown> {
  const call = mocks.putItemValuation.mock.calls.at(-1);
  expect(call).toBeDefined();
  return call?.[1] as Record<string, unknown>;
}

async function runBootstrap(scenario: PriceScenario) {
  const view = renderBootstrap();

  await act(async () => {
    view.result.current.bootstrap(scenario);
  });

  return view;
}

describe("useBootstrapPurchasePrice (intention §4A M1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.putItemValuation.mockResolvedValue({
      item_valuation: { client_id: "ival_new" },
      preview: { status: "item_missing_expected_price" },
    });
  });

  it("1. converts per-piece minor units to whole-item minor units and echoes the saved expected price", async () => {
    mocks.fetchItemLookup.mockResolvedValue({ items: [lookupResult(47499)] });

    const scenario = referenceScenario();
    scenario.currency = null;

    await runBootstrap(scenario);

    await waitFor(() => expect(mocks.putItemValuation).toHaveBeenCalledTimes(1));

    expect(mocks.putItemValuation.mock.calls[0]?.[0]).toBe("itm_ref0001");
    // 47 499 öre per piece → 474.99 kronor, rounded back *before* multiplying, × 6.
    expect(lastPutBody()).toEqual({
      purchase_cost_minor: 284994,
      expected_sale_price_minor: 855000,
      currency: "swedish_krona",
    });
  });

  it("2. treats quantity 0 as one piece (handoff §8.2)", async () => {
    mocks.fetchItemLookup.mockResolvedValue({ items: [lookupResult(47499)] });

    const scenario = referenceScenario();
    scenario.item = { ...scenario.item!, quantity: 0 };

    await runBootstrap(scenario);

    await waitFor(() => expect(mocks.putItemValuation).toHaveBeenCalledTimes(1));
    expect(lastPutBody().purchase_cost_minor).toBe(47499);
  });

  it("3. omits the expected-price key entirely when no valuation exists", async () => {
    mocks.fetchItemLookup.mockResolvedValue({ items: [lookupResult(47499)] });

    const scenario = referenceScenario();
    scenario.saved = null;

    await runBootstrap(scenario);

    await waitFor(() => expect(mocks.putItemValuation).toHaveBeenCalledTimes(1));

    const body = lastPutBody();
    // Absent, not null — the two are different instructions to this endpoint.
    expect(body).not.toHaveProperty("expected_sale_price_minor");
    expect(Object.keys(body).sort()).toEqual([
      "currency",
      "purchase_cost_minor",
    ]);
  });

  it("4. does not PUT when the item is not on the purchase application", async () => {
    mocks.fetchItemLookup.mockResolvedValue({
      items: [lookupResult(47499, "internal_api")],
    });

    const view = await runBootstrap(referenceScenario());

    await waitFor(() =>
      expect(view.result.current.errorMessage).toBe(
        "The item was not found — it must first be created on the purchase application.",
      ),
    );
    expect(mocks.putItemValuation).not.toHaveBeenCalled();
  });

  it("5. does not PUT when the purchase price is missing", async () => {
    mocks.fetchItemLookup.mockResolvedValue({ items: [lookupResult(null)] });

    const view = await runBootstrap(referenceScenario());

    await waitFor(() =>
      expect(view.result.current.errorMessage).toBe(
        "Set the purchase price on the purchase application, then fetch again.",
      ),
    );
    expect(mocks.putItemValuation).not.toHaveBeenCalled();
  });

  it("5b. does not PUT for a negative or non-finite purchase price", async () => {
    for (const price of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      vi.clearAllMocks();
      mocks.fetchItemLookup.mockResolvedValue({ items: [lookupResult(price)] });

      await runBootstrap(referenceScenario());

      expect(mocks.putItemValuation).not.toHaveBeenCalled();
    }
  });

  it("6. never fires the lookup when the item has no article number", async () => {
    const scenario = referenceScenario();
    scenario.item = { ...scenario.item!, article_number: null };

    await runBootstrap(scenario);

    expect(mocks.fetchItemLookup).not.toHaveBeenCalled();
    expect(mocks.putItemValuation).not.toHaveBeenCalled();
  });

  it("7. invalidates the scenario query exactly once on success", async () => {
    mocks.fetchItemLookup.mockResolvedValue({ items: [lookupResult(47499)] });

    const view = await runBootstrap(referenceScenario());

    await waitFor(() => expect(mocks.putItemValuation).toHaveBeenCalledTimes(1));

    const scenarioInvalidations = view.invalidate.mock.calls.filter(
      (call) =>
        JSON.stringify(call[0]?.queryKey) ===
        JSON.stringify(itemEconomicsKeys.priceScenario(TASK_ID)),
    );

    expect(scenarioInvalidations).toHaveLength(1);
  });
});
