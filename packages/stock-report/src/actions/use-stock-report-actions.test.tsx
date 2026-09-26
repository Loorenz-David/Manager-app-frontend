import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  createStockAssignment: vi.fn(),
  createStockReportVersion: vi.fn(),
  removeStockAssignment: vi.fn(),
  reorderStockReportItem: vi.fn(),
  setStockReportMissingQuantity: vi.fn(),
  setStockReportPriority: vi.fn(),
}));
const notify = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("../api/stock-report-api", () => api);
vi.mock("@beyo/lib", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/lib")>()),
  notify,
}));

import { ApiRequestError } from "@beyo/api-client";
import {
  useCreateStockAssignment,
  useCreateStockReportVersion,
  useRemoveStockAssignment,
  useReorderStockReportItem,
  useSetStockReportMissingQuantity,
  useSetStockReportPriority,
} from "./use-stock-report-actions";
import { stockReportKeys } from "../api/stock-report-keys";
import {
  wirePrioritisedStockReportItem,
  wireStockReportAssignment,
  wireStockReportSnapshotVersion,
} from "../fixtures/stock-report-wire-fixtures";
import {
  EMPTY_STOCK_REPORT_FILTER as ALL,
  type StockReportAssignment,
  type StockReportItem,
} from "../stock-report.types";

const WOOD = { majorCategory: "wood" as const, missingOnly: false };
const MISSING = { majorCategory: null, missingOnly: true };

function item(
  client_id: string,
  priority: "high" | "low" | null,
  priority_order: number | null = priority ? 1 : null,
  missing = 0,
): StockReportItem {
  return wirePrioritisedStockReportItem(client_id, priority, priority_order, {
    snapshot: { ...wirePrioritisedStockReportItem(client_id, priority).snapshot!, quantity_missing: missing },
  });
}

const orders = (rows: StockReportItem[] | undefined) => rows?.map((row) => row.snapshot?.priority_order);
const ids = (rows: StockReportItem[] | undefined) => rows?.map((row) => row.client_id);

function assignment(client_id: string): StockReportAssignment {
  return wireStockReportAssignment({ client_id });
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

describe("stock-report mutations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves a priority optimistically and restores every bucket on failure", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("low", ALL), [item("sri-2", "low")]);
    api.setStockReportPriority.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useSetStockReportPriority(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", priority: "low" }));
    await waitFor(() => expect(api.setStockReportPriority).toHaveBeenCalledWith("sri-1", "low"));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.map((row) => row.client_id)).toEqual(["sri-1"]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", ALL))?.map((row) => row.client_id)).toEqual(["sri-2"]);
    // A silent snap-back reads as a glitch (W-3); a non-API failure gets the generic copy.
    expect(notify.error).toHaveBeenCalledWith("Priority not changed", "The change could not be saved. Pull to refresh and try again.");
  });

  it("lands an optimistic priority move in every cached list of the destination bucket, filtered or not", async () => {
    // The board may hold the same bucket under two filters (a worker's Wood
    // default and a later "all"); the moved row must not vanish from either.
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("low", ALL), [item("sri-2", "low")]);
    queryClient.setQueryData(stockReportKeys.list("low", WOOD), [item("sri-2", "low")]);
    api.setStockReportPriority.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSetStockReportPriority(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", priority: "low" }));
    await waitFor(() => expect(api.setStockReportPriority).toHaveBeenCalled());

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))).toEqual([]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", ALL))?.map((row) => row.client_id)).toEqual(["sri-2", "sri-1"]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", WOOD))?.map((row) => row.client_id)).toEqual(["sri-2", "sri-1"]);
  });

  it("reorders the list of the bucket *and* filter being viewed, not the unfiltered one", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", WOOD), [item("sri-1", "high", 1), item("sri-2", "high", 2)]);
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high", 1), item("sri-2", "high", 2)]);
    api.reorderStockReportItem.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useReorderStockReportItem("high", WOOD), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", targetOrder: 2 }));
    await waitFor(() => expect(api.reorderStockReportItem).toHaveBeenCalled());

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", WOOD))?.map((row) => row.client_id)).toEqual(["sri-2", "sri-1"]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.map((row) => row.client_id)).toEqual(["sri-1", "sri-2"]);
  });

  it("sends the target position verbatim and rolls back on refusal", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high", 1), item("sri-2", "high", 2)]);
    // The backend's own sentence for STOCK_REPORT_TARGET_OUT_OF_RANGE, in the
    // `{ error, ok: false }` shape the api-client lifts into `message`.
    api.reorderStockReportItem.mockRejectedValueOnce(new ApiRequestError(422, "unprocessable", "Target position is out of range."));
    const { result } = renderHook(() => useReorderStockReportItem("high", ALL), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", targetOrder: 2 }));
    // Verbatim: no index arithmetic stands between the drop and the request.
    await waitFor(() => expect(api.reorderStockReportItem).toHaveBeenCalledWith("sri-1", 2));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.map((row) => row.client_id)).toEqual(["sri-1", "sri-2"]);
    expect(notify.error).toHaveBeenCalledWith("Order not changed", "Target position is out of range.");
  });

  it("shifts the cached orders the way the server will, across a gap the board cannot see", async () => {
    const { queryClient, wrapper } = setup();
    // The owner's real High group: positions 1, 3, 4, 5. Position 2 belongs to
    // a row the list query hides (`quantity_requested` of 0), so the board's
    // indices and the group's positions do not line up.
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [
      item("sri-a", "high", 1),
      item("sri-b", "high", 3),
      item("sri-c", "high", 4),
      item("sri-d", "high", 5),
    ]);
    api.reorderStockReportItem.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useReorderStockReportItem("high", ALL), { wrapper });

    // Drop B onto C: the target is C's own position, 4 — not its index plus one.
    act(() => result.current.mutate({ stockNeedId: "sri-b", targetOrder: 4 }));
    await waitFor(() => expect(api.reorderStockReportItem).toHaveBeenCalledWith("sri-b", 4));

    const rows = queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL));
    expect(rows?.map((row) => row.client_id)).toEqual(["sri-a", "sri-c", "sri-b", "sri-d"]);
    // And the orders stay true, so the next drag reads live positions rather
    // than the ones this move invalidated.
    expect(orders(rows)).toEqual([1, 3, 4, 5]);
  });

  it("drops loaded offsets and restarts at page zero after a reorder settles", async () => {
    const { queryClient, wrapper } = setup();
    const key = stockReportKeys.list("high", ALL);
    queryClient.setQueryData(key, {
      pages: [
        { items: [item("sri-1", "high", 1)], hasMore: true, limit: 20, offset: 0 },
        { items: [item("sri-2", "high", 21)], hasMore: false, limit: 20, offset: 20 },
      ],
      pageParams: [0, 20],
    });
    api.reorderStockReportItem.mockResolvedValueOnce(item("sri-1", "high", 21));
    const { result } = renderHook(() => useReorderStockReportItem("high", ALL), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ stockNeedId: "sri-1", targetOrder: 21 });
    });

    const data = queryClient.getQueryData<{ pages: unknown[]; pageParams: unknown[] }>(key);
    expect(data?.pages).toHaveLength(1);
    expect(data?.pageParams).toEqual([0]);
  });

  it("keeps a moved row inside an All list, re-labelled, instead of stripping it", async () => {
    // The missing page's All bucket holds every priority at once: a priority
    // change must not make the card vanish from it.
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("all", MISSING), [item("sri-1", "high", 1, 2), item("sri-2", "low", 1, 1)]);
    queryClient.setQueryData(stockReportKeys.list("low", MISSING), [item("sri-2", "low", 1, 1)]);
    api.setStockReportPriority.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSetStockReportPriority(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", priority: "low" }));
    await waitFor(() => expect(api.setStockReportPriority).toHaveBeenCalled());

    const all = queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("all", MISSING));
    expect(ids(all)).toEqual(["sri-1", "sri-2"]);
    expect(all?.[0]?.snapshot?.priority).toBe("low");
    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", MISSING)))).toEqual(["sri-2", "sri-1"]);
  });

  it("never lands a row with nothing missing in a missing-mode list", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high", 1, 0)]);
    queryClient.setQueryData(stockReportKeys.list("low", MISSING), [item("sri-2", "low", 1, 3)]);
    api.setStockReportPriority.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSetStockReportPriority(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", priority: "low" }));
    await waitFor(() => expect(api.setStockReportPriority).toHaveBeenCalled());

    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", MISSING)))).toEqual(["sri-2"]);
  });

  it("marks missing optimistically on every list, drops a cleared row from the missing lists, and rolls back", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high", 1, 2)]);
    queryClient.setQueryData(stockReportKeys.list("all", MISSING), [item("sri-1", "high", 1, 2), item("sri-2", "low", 1, 1)]);
    api.setStockReportMissingQuantity.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSetStockReportMissingQuantity(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", quantityMissing: 0 }));
    await waitFor(() => expect(api.setStockReportMissingQuantity).toHaveBeenCalledWith("sri-1", 0));

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.[0]?.snapshot?.quantity_missing).toBe(0);
    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("all", MISSING)))).toEqual(["sri-2"]);
  });

  it("keeps the open detail page's own entry true when a cleared row leaves every list", async () => {
    // The owner's report (2026-09-26): opened from the missing page, marking
    // updated the detail but unmarking did not — the row left the missing
    // list and the page had nothing left to read. The detail entry is what
    // it reads now, through the optimistic write and the server's row alike.
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("all", MISSING), [item("sri-1", "high", 1, 3)]);
    queryClient.setQueryData(stockReportKeys.item("sri-1"), item("sri-1", "high", 1, 3));
    api.setStockReportMissingQuantity.mockResolvedValueOnce(item("sri-1", "high", 1, 0));
    const { result } = renderHook(() => useSetStockReportMissingQuantity(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", quantityMissing: 0 }));
    await waitFor(() => expect(api.setStockReportMissingQuantity).toHaveBeenCalled());
    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("all", MISSING)))).toEqual([]);
    expect(queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-1"))?.snapshot?.quantity_missing).toBe(0);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-1"))?.snapshot?.quantity_missing).toBe(0);
  });

  it("restores the detail entry with the lists when the backend refuses", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.item("sri-1"), item("sri-1", "high", 1, 2));
    api.setStockReportMissingQuantity.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useSetStockReportMissingQuantity(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", quantityMissing: 0 }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-1"))?.snapshot?.quantity_missing).toBe(2);
  });

  it("restores the exact lists and explains when the backend refuses the missing quantity", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high", 1, 0)]);
    api.setStockReportMissingQuantity.mockRejectedValueOnce(new ApiRequestError(422, "unprocessable", "STOCK_REPORT_MISSING_EXCEEDS_CEILING: at most 3 can be missing."));
    const { result } = renderHook(() => useSetStockReportMissingQuantity(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", quantityMissing: 5 }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.[0]?.snapshot?.quantity_missing).toBe(0);
    expect(notify.error).toHaveBeenCalledWith("Missing quantity not changed", "STOCK_REPORT_MISSING_EXCEEDS_CEILING: at most 3 can be missing.");
  });

  it("seeds the authoritative row on success and refreshes the summary and version", async () => {
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high", 1, 0)]);
    // The backend clamps: asked 5, it kept 3.
    api.setStockReportMissingQuantity.mockResolvedValueOnce(item("sri-1", "high", 1, 3));
    const { result } = renderHook(() => useSetStockReportMissingQuantity(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ stockNeedId: "sri-1", quantityMissing: 5 });
    });

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.[0]?.snapshot?.quantity_missing).toBe(3);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: stockReportKeys.missingSummary(), refetchType: "active" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: stockReportKeys.activeVersion(), refetchType: "active" });
  });

  it("drops every cached board list when a version is opened, so the board never shows the old priorities", async () => {
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high")]);
    const { progress: _progress, ...version } = wireStockReportSnapshotVersion({ client_id: "srv-2" });
    api.createStockReportVersion.mockResolvedValueOnce(version);
    const { result } = renderHook(() => useCreateStockReportVersion(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(queryClient.getQueryData(stockReportKeys.list("high", ALL))).toBeUndefined();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: stockReportKeys.activeVersion(), refetchType: "active" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: stockReportKeys.versionList(), refetchType: "active" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: stockReportKeys.missingSummary(), refetchType: "active" });
    // No toast: the hub's overlay is the failure surface, and success needs none.
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("writes a successful created assignment straight to the detail cache", async () => {
    const { queryClient, wrapper } = setup();
    api.createStockAssignment.mockResolvedValueOnce(assignment("sta-1"));
    const { result } = renderHook(() => useCreateStockAssignment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ stockReportItemId: "sri-1", taskId: "tsk-1", itemId: "itm-1", overridePropertyMismatch: true });
    });

    expect(queryClient.getQueryData<StockReportAssignment[]>(stockReportKeys.assignmentList("sri-1"))?.map((row) => row.client_id)).toEqual(["sta-1"]);
    expect(api.createStockAssignment.mock.calls[0]?.[0]).toMatchObject({ overridePropertyMismatch: true });
  });

  it("removes optimistically and restores the exact assignment list on failure", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.assignmentList("sri-1"), [assignment("sta-1"), assignment("sta-2")]);
    api.removeStockAssignment.mockRejectedValueOnce(new Error("not found"));
    const { result } = renderHook(() => useRemoveStockAssignment("sri-1"), { wrapper });

    act(() => result.current.mutate("sta-1"));
    await waitFor(() => expect(api.removeStockAssignment.mock.calls[0]?.[0]).toBe("sta-1"));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<StockReportAssignment[]>(stockReportKeys.assignmentList("sri-1"))?.map((row) => row.client_id)).toEqual(["sta-1", "sta-2"]);
  });
});
