import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  activateStockReportVersion: vi.fn(),
  createStockAssignment: vi.fn(),
  createStockReportVersion: vi.fn(),
  deleteStockReportVersion: vi.fn(),
  refreshStockReportVersionRequested: vi.fn(),
  removeStockAssignment: vi.fn(),
  reorderStockReportItem: vi.fn(),
  setStockReportMissingQuantity: vi.fn(),
  setStockReportPriority: vi.fn(),
  setStockReportRequestedQuantity: vi.fn(),
  updateStockReportVersion: vi.fn(),
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));

vi.mock("../api/stock-report-api", () => api);
vi.mock("@beyo/lib", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/lib")>()),
  notify,
}));

import { ApiRequestError } from "@beyo/api-client";
import {
  useActivateStockReportVersion,
  useCreateStockAssignment,
  useCreateStockReportVersion,
  useDeleteStockReportVersion,
  useRefreshStockReportVersionRequested,
  useRemoveStockAssignment,
  useReorderStockReportItem,
  useSetStockReportMissingQuantity,
  useSetStockReportPriority,
  useSetStockReportRequestedQuantity,
  useUpdateStockReportVersion,
} from "./use-stock-report-actions";
import { stockReportKeys } from "../api/stock-report-keys";
import {
  wireBorrowingDraftSnapshot,
  wirePrioritisedStockReportItem,
  wireStockReportAssignment,
  wireStockReportItem,
  wireStockReportSnapshotVersion,
} from "../fixtures/stock-report-wire-fixtures";
import {
  EMPTY_STOCK_REPORT_FILTER as ALL,
  type StockReportAssignment,
  type StockReportItem,
  type StockReportItemSnapshot,
  type StockReportSnapshotVersion,
} from "../stock-report.types";

const WOOD = { majorCategory: "wood" as const, missingOnly: false, versionId: null };
const MISSING = { majorCategory: null, missingOnly: true, versionId: null };
const DRAFT = { majorCategory: null, missingOnly: false, versionId: "srv-draft" };
const invalidation = (queryKey: readonly unknown[]) => ({ queryKey, refetchType: "active" as const });

function item(
  client_id: string,
  priority: "high" | "low" | null,
  priority_order: number | null = priority ? 1 : null,
  missing = 0,
): StockReportItem {
  return wirePrioritisedStockReportItem(client_id, priority, priority_order, {
    snapshot: { ...wirePrioritisedStockReportItem(client_id, priority).snapshot!, quantity_missing: missing, active_quantity_missing: missing },
  });
}

/** A draft-scope row of the same stock need, borrowing the board's count unless told otherwise. */
function draftItem(client_id: string, priority: "high" | "low" | null, snapshot: Partial<StockReportItemSnapshot> = {}): StockReportItem {
  return wireStockReportItem({
    client_id,
    snapshot: wireBorrowingDraftSnapshot({ client_id: `dsnap-${client_id}`, stock_report_item_id: client_id, priority, priority_order: priority ? 1 : null, ...snapshot }),
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
    // The board uses the shortcut route: no version id on the request.
    await waitFor(() => expect(api.setStockReportPriority).toHaveBeenCalledWith("sri-1", "low"));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL)))).toEqual(["sri-1"]);
    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", ALL)))).toEqual(["sri-2"]);
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
    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", ALL)))).toEqual(["sri-2", "sri-1"]);
    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", WOOD)))).toEqual(["sri-2", "sri-1"]);
  });

  /**
   * Projection R6/R7: a draft's move walks the draft's bucket lists — under
   * the scoped keys the unscoped prefix matches nothing, and the move would
   * silently stop — and never the board's list of the same bucket.
   */
  it("lands a draft's priority move in the draft's destination lists only, through the versioned route", async () => {
    const { queryClient, wrapper } = setup();
    const activeLow = [item("sri-9", "low")];
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [draftItem("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("low", DRAFT), [draftItem("sri-2", "low")]);
    queryClient.setQueryData(stockReportKeys.list("low", ALL), activeLow);
    api.setStockReportPriority.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSetStockReportPriority({ versionId: "srv-draft" }), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", priority: "low" }));
    await waitFor(() => expect(api.setStockReportPriority).toHaveBeenCalledWith("sri-1", "low", "srv-draft"));

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", DRAFT))).toEqual([]);
    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", DRAFT)))).toEqual(["sri-2", "sri-1"]);
    expect(queryClient.getQueryData(stockReportKeys.list("low", ALL))).toBe(activeLow);
  });

  it("reorders the list of the bucket *and* filter being viewed, not the unfiltered one", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", WOOD), [item("sri-1", "high", 1), item("sri-2", "high", 2)]);
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high", 1), item("sri-2", "high", 2)]);
    api.reorderStockReportItem.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useReorderStockReportItem("high", WOOD), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", targetOrder: 2 }));
    await waitFor(() => expect(api.reorderStockReportItem).toHaveBeenCalled());

    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", WOOD)))).toEqual(["sri-2", "sri-1"]);
    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL)))).toEqual(["sri-1", "sri-2"]);
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

    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL)))).toEqual(["sri-1", "sri-2"]);
    expect(notify.error).toHaveBeenCalledWith("Order not changed", "Target position is out of range.");
  });

  it("reorders a draft through the versioned route", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [draftItem("sri-1", "high", { priority_order: 1 }), draftItem("sri-2", "high", { priority_order: 2 })]);
    api.reorderStockReportItem.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useReorderStockReportItem("high", DRAFT), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", targetOrder: 2 }));
    await waitFor(() => expect(api.reorderStockReportItem).toHaveBeenCalledWith("sri-1", 2, "srv-draft"));
    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", DRAFT)))).toEqual(["sri-2", "sri-1"]);
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
    expect(ids(rows)).toEqual(["sri-a", "sri-c", "sri-b", "sri-d"]);
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
    queryClient.setQueryData(stockReportKeys.item("sri-1", "active"), item("sri-1", "high", 1, 3));
    api.setStockReportMissingQuantity.mockResolvedValueOnce(item("sri-1", "high", 1, 0));
    const { result } = renderHook(() => useSetStockReportMissingQuantity(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", quantityMissing: 0 }));
    await waitFor(() => expect(api.setStockReportMissingQuantity).toHaveBeenCalled());
    expect(ids(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("all", MISSING)))).toEqual([]);
    expect(queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-1", "active"))?.snapshot?.quantity_missing).toBe(0);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-1", "active"))?.snapshot?.quantity_missing).toBe(0);
  });

  it("restores the detail entry with the lists when the backend refuses", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.item("sri-1", "active"), item("sri-1", "high", 1, 2));
    api.setStockReportMissingQuantity.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useSetStockReportMissingQuantity(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", quantityMissing: 0 }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-1", "active"))?.snapshot?.quantity_missing).toBe(2);
  });

  it("restores the exact lists and explains when the backend refuses the missing quantity", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high", 1, 0)]);
    api.setStockReportMissingQuantity.mockRejectedValueOnce(new ApiRequestError(422, "unprocessable", "STOCK_REPORT_MISSING_EXCEEDS_CEILING: at most 3 can be missing."));
    const { result } = renderHook(() => useSetStockReportMissingQuantity(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", quantityMissing: 5 }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.[0]?.snapshot?.quantity_missing).toBe(0);
    expect(notify.error).toHaveBeenCalledWith("Missing quantity not changed", "That is more than what is still uncovered.");
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
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.missingSummary()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.activeVersion()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionLists("active")));
  });

  /**
   * Projection R7: a versioned route answers with *that version's* snapshot
   * (v7 §5.14). Seeding it into the board's list would repaint the board with
   * the draft's row — the very defect v7 §0.1 closed, through the response.
   */
  it("keeps a draft's missing edit — optimistic patch and response alike — out of the board's lists", async () => {
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const board = [item("sri-1", "high", 1, 0)];
    queryClient.setQueryData(stockReportKeys.list("high", ALL), board);
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [draftItem("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.item("sri-1", "srv-draft"), draftItem("sri-1", "high"));
    api.setStockReportMissingQuantity.mockResolvedValueOnce(draftItem("sri-1", "high", { quantity_missing: 3, quantity_missing_source: "own" }));
    const { result } = renderHook(() => useSetStockReportMissingQuantity({ versionId: "srv-draft" }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ stockNeedId: "sri-1", quantityMissing: 3 });
    });

    expect(api.setStockReportMissingQuantity).toHaveBeenCalledWith("sri-1", 3, "srv-draft");
    expect(queryClient.getQueryData(stockReportKeys.list("high", ALL))).toBe(board);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", DRAFT))?.[0]?.snapshot).toMatchObject({ quantity_missing: 3, quantity_missing_source: "own" });
    expect(queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-1", "srv-draft"))?.snapshot).toMatchObject({ quantity_missing: 3 });
    // The draft's own reads move; the board's summary and active read do not (R17: leaves only).
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionLists("srv-draft")));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.version("srv-draft")));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.versionLists("active")));
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.missingSummary()));
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.versions()));
  });

  /** v9 §5.16: `null` drops the draft's own number and the row borrows the board's count again. */
  it("borrows the board's count optimistically on a null missing and restores the typed one on failure", async () => {
    const { queryClient, wrapper } = setup();
    const typed = draftItem("sri-1", "high", { quantity_missing: 4, quantity_missing_source: "own", active_quantity_missing: 2 });
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [typed]);
    queryClient.setQueryData(stockReportKeys.item("sri-1", "srv-draft"), typed);
    let reject: (error: Error) => void = () => {};
    api.setStockReportMissingQuantity.mockImplementationOnce(() => new Promise((_resolve, r) => { reject = r; }));
    const { result } = renderHook(() => useSetStockReportMissingQuantity({ versionId: "srv-draft" }), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", quantityMissing: null }));
    await waitFor(() => expect(api.setStockReportMissingQuantity).toHaveBeenCalledWith("sri-1", null, "srv-draft"));
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", DRAFT))?.[0]?.snapshot).toMatchObject({ quantity_missing: 2, quantity_missing_source: "active" });
    expect(queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-1", "srv-draft"))?.snapshot).toMatchObject({ quantity_missing: 2, quantity_missing_source: "active" });

    act(() => reject(new Error("offline")));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", DRAFT))?.[0]?.snapshot).toMatchObject({ quantity_missing: 4, quantity_missing_source: "own" });
    expect(queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-1", "srv-draft"))?.snapshot).toMatchObject({ quantity_missing: 4 });
  });

  /**
   * v8 §5.22: the board's requested edit names the active version (the row's
   * own `snapshot.version_id`) and clamps the missing count at once to what
   * the new value leaves uncovered.
   */
  it("sets a manual requested quantity optimistically, clamps missing on the board, and rolls back", async () => {
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const before = wireStockReportItem({ client_id: "sri-1", quantity_requested: 10, quantity_in_queue: 2, quantity_in_progress: 1, quantity_awaiting: 3 });
    before.snapshot = { ...before.snapshot!, quantity_missing: 4, active_quantity_missing: 4 };
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [before]);
    queryClient.setQueryData(stockReportKeys.item("sri-1", "active"), before);
    let reject: (error: Error) => void = () => {};
    api.setStockReportRequestedQuantity.mockImplementationOnce(() => new Promise((_resolve, r) => { reject = r; }));
    const { result } = renderHook(() => useSetStockReportRequestedQuantity({ versionId: "srv-1", scope: "active" }), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", value: 7 }));
    await waitFor(() => expect(api.setStockReportRequestedQuantity).toHaveBeenCalledWith("sri-1", 7, "srv-1"));
    // 7 requested − (2 + 1 + 3) covered leaves 1: the 4 missing clamp to it.
    const snapshot = () => queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-1", "active"))?.snapshot;
    expect(snapshot()).toMatchObject({ quantity_requested: 7, quantity_requested_source: "manual", quantity_missing: 1, active_quantity_missing: 1 });
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.[0]?.snapshot?.quantity_requested).toBe(7);

    act(() => reject(new ApiRequestError(422, "unprocessable", "STOCK_REPORT_VERSION_NOT_FOUND: no such version.")));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(snapshot()).toMatchObject({ quantity_requested: 10, quantity_requested_source: "scanner", quantity_missing: 4 });
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.[0]?.snapshot?.quantity_requested).toBe(10);
    expect(notify.error).toHaveBeenCalledWith("Requested quantity not changed", expect.any(String));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionLists("active")));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.activeVersion()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.missingSummary()));
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.versions()));
  });

  it("returns a draft's requested value to Scanner's on null, without touching the missing count", async () => {
    const { queryClient, wrapper } = setup();
    const manual = draftItem("sri-1", "high", { quantity_requested: 9, quantity_requested_scanner: 5, quantity_requested_source: "manual", quantity_missing: 4, quantity_missing_source: "own" });
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [manual]);
    api.setStockReportRequestedQuantity.mockResolvedValueOnce(draftItem("sri-1", "high", { quantity_requested: 5, quantity_missing: 4, quantity_missing_source: "own" }));
    const { result } = renderHook(() => useSetStockReportRequestedQuantity({ versionId: "srv-draft", scope: "srv-draft" }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ stockNeedId: "sri-1", value: null });
    });

    expect(api.setStockReportRequestedQuantity).toHaveBeenCalledWith("sri-1", null, "srv-draft");
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", DRAFT))?.[0]?.snapshot).toMatchObject({ quantity_requested: 5, quantity_requested_source: "scanner", quantity_missing: 4 });
  });

  it("drops every cached board list when a version is opened, so the board never shows the old priorities", async () => {
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high")]);
    const { progress: _progress, ...version } = wireStockReportSnapshotVersion({ client_id: "srv-2" });
    api.createStockReportVersion.mockResolvedValueOnce(version);
    const { result } = renderHook(() => useCreateStockReportVersion(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(queryClient.getQueryData(stockReportKeys.list("high", ALL))).toBeUndefined();
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.activeVersion()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.missingSummary()));
    // No toast: the hub's overlay is the failure surface, and success needs none.
    expect(notify.error).not.toHaveBeenCalled();
  });

  /** v8 §5.8: a draft leaves the board alone — the drafts list and the hub's count move (R17: leaves only). */
  it("keeps the board and refetches the drafts list and count when a draft is created", async () => {
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const board = [item("sri-1", "high")];
    queryClient.setQueryData(stockReportKeys.list("high", ALL), board);
    const { progress: _progress, ...version } = wireStockReportSnapshotVersion({ client_id: "srv-draft", state: "draft", active_at: null });
    api.createStockReportVersion.mockResolvedValueOnce(version);
    const { result } = renderHook(() => useCreateStockReportVersion(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ draft: true, title: "Autumn", scheduledAt: null });
    });

    expect(api.createStockReportVersion).toHaveBeenCalledWith({ draft: true, title: "Autumn", scheduledAt: null });
    expect(queryClient.getQueryData(stockReportKeys.list("high", ALL))).toBe(board);
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.draftCount()));
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.activeVersion()));
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.versions()));
  });

  it("merges an edited version's row into its cached reads, keeping their progress", async () => {
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const cached = wireStockReportSnapshotVersion({ client_id: "srv-draft", state: "draft", active_at: null, title: null });
    queryClient.setQueryData(stockReportKeys.version("srv-draft", "high,medium,low"), cached);
    const { progress: _progress, ...row } = wireStockReportSnapshotVersion({ client_id: "srv-draft", state: "draft", active_at: null, title: "Autumn", scheduled_activation_at: "2026-10-05T04:00:00+00:00" });
    api.updateStockReportVersion.mockResolvedValueOnce(row);
    const { result } = renderHook(() => useUpdateStockReportVersion("srv-draft"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: "Autumn", scheduledAt: "2026-10-05T04:00:00+00:00" });
    });

    expect(api.updateStockReportVersion).toHaveBeenCalledWith("srv-draft", { title: "Autumn", scheduledAt: "2026-10-05T04:00:00+00:00" });
    const merged = queryClient.getQueryData<StockReportSnapshotVersion>(stockReportKeys.version("srv-draft", "high,medium,low"));
    expect(merged).toMatchObject({ title: "Autumn", scheduled_activation_at: "2026-10-05T04:00:00+00:00" });
    expect(merged?.progress).toBe(cached.progress);
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.activeVersion()));
  });

  /** v9 §5.17: the body is exactly the keep flag; both scopes' lists are dropped (R11) and the leaves refetched (R17). */
  it("activates a draft with the keep flag as given, drops both scopes' lists and toasts", async () => {
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [draftItem("sri-1", "high")]);
    const { progress: _progress, ...row } = wireStockReportSnapshotVersion({ client_id: "srv-draft" });
    api.activateStockReportVersion.mockResolvedValueOnce(row);
    const { result } = renderHook(() => useActivateStockReportVersion("srv-draft"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ keepActiveMissing: true });
    });

    expect(api.activateStockReportVersion).toHaveBeenCalledWith("srv-draft", { keepActiveMissing: true });
    expect(queryClient.getQueryData(stockReportKeys.list("high", ALL))).toBeUndefined();
    expect(queryClient.getQueryData(stockReportKeys.list("high", DRAFT))).toBeUndefined();
    for (const queryKey of [stockReportKeys.versionList(), stockReportKeys.activeVersion(), stockReportKeys.version("srv-draft"), stockReportKeys.draftCount(), stockReportKeys.missingSummary()]) {
      expect(invalidate).toHaveBeenCalledWith(invalidation(queryKey));
    }
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.versions()));
    expect(notify.success).toHaveBeenCalledWith("Version is live");
  });

  it("explains a refused activation", async () => {
    const { wrapper } = setup();
    api.activateStockReportVersion.mockRejectedValueOnce(new ApiRequestError(422, "unprocessable", "STOCK_REPORT_VERSION_NOT_DRAFT: already active."));
    const { result } = renderHook(() => useActivateStockReportVersion("srv-draft"), { wrapper });

    act(() => result.current.mutate({ keepActiveMissing: false }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(notify.error).toHaveBeenCalledWith("Activation failed", expect.any(String));
    expect(notify.success).not.toHaveBeenCalled();
  });

  it("restarts the board and the version's scope after a refresh and reports the counts", async () => {
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { progress: _progress, ...row } = wireStockReportSnapshotVersion({ client_id: "srv-1" });
    api.refreshStockReportVersionRequested.mockResolvedValueOnce({ version: row, changed: 3, added: 1 });
    const { result } = renderHook(() => useRefreshStockReportVersionRequested("srv-1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ keepManualRequested: false });
    });

    expect(api.refreshStockReportVersionRequested).toHaveBeenCalledWith("srv-1", { keepManualRequested: false });
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionLists("active")));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionLists("srv-1")));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versions()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.missingSummary()));
    expect(notify.success).toHaveBeenCalledWith("Refreshed from Scanner", "3 changed, 1 added");
  });

  it("drops a deleted draft's lists and read, refetches the drafts list and count, and toasts", async () => {
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const board = [item("sri-1", "high")];
    queryClient.setQueryData(stockReportKeys.list("high", ALL), board);
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [draftItem("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.version("srv-draft", "high,medium,low"), wireStockReportSnapshotVersion({ client_id: "srv-draft", state: "draft" }));
    api.deleteStockReportVersion.mockResolvedValueOnce("srv-draft");
    const { result } = renderHook(() => useDeleteStockReportVersion("srv-draft"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(api.deleteStockReportVersion).toHaveBeenCalledWith("srv-draft");
    expect(queryClient.getQueryData(stockReportKeys.list("high", DRAFT))).toBeUndefined();
    expect(queryClient.getQueryData(stockReportKeys.version("srv-draft", "high,medium,low"))).toBeUndefined();
    expect(queryClient.getQueryData(stockReportKeys.list("high", ALL))).toBe(board);
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.draftCount()));
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.versions()));
    expect(notify.success).toHaveBeenCalledWith("Draft deleted");
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
