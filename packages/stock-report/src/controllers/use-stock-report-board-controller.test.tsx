import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  list: vi.fn(),
  permissions: vi.fn(),
  reorder: { mutate: vi.fn(), isPending: false },
  setPriority: { mutate: vi.fn() },
}));

vi.mock("@beyo/hooks", () => ({ useSurface: () => ({ open: mocks.open }), usePreloadSurface: vi.fn() }));
vi.mock("../api/use-stock-report-queries", () => ({ useStockReportListQuery: mocks.list }));
vi.mock("../actions/use-stock-report-actions", () => ({ useReorderStockReportItem: () => mocks.reorder, useSetStockReportPriority: () => mocks.setPriority }));
vi.mock("../lib/use-stock-report-permissions", () => ({ useStockReportPermissions: mocks.permissions }));
vi.mock("../surface-ids", () => ({ preloadStockReportDetailSurface: vi.fn(), STOCK_REPORT_DETAIL_SURFACE_ID: "stock-report-detail-slide", STOCK_REPORT_PRIORITY_SURFACE_ID: "stock-report-priority-sheet", STOCK_REPORT_FILTER_SURFACE_ID: "stock-report-filter-sheet" }));

import { ApiRequestError } from "@beyo/api-client";
import { wirePrioritisedStockReportItem } from "../fixtures/stock-report-wire-fixtures";
import { useStockReportBoardController } from "./use-stock-report-board-controller";

const ready = (items: unknown[] = [], hasMore = false) => ({
  data: { pages: [{ items, hasMore, limit: 20, offset: 0 }], pageParams: [0] },
  isSuccess: true,
  isPending: false,
  isError: false,
  error: null,
  hasNextPage: hasMore,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn().mockResolvedValue(undefined),
  refetchFromStart: vi.fn().mockResolvedValue(undefined),
});
const failed = (error: Error) => ({ data: undefined, isSuccess: false, isPending: false, isError: true, error, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn(), refetchFromStart: vi.fn() });
const managerPermissions = { canPrioritise: true, canAssign: true, canMarkMissing: true, canManageVersions: true, seesUnset: true, buckets: ["unset", "high", "medium", "low"], isWorker: false, defaultMajorCategory: null };
const workerPermissions = (defaultMajorCategory: "wood" | "seat") => ({ canPrioritise: false, canAssign: defaultMajorCategory === "wood", canMarkMissing: true, canManageVersions: false, seesUnset: false, buckets: ["high", "medium", "low"], isWorker: true, defaultMajorCategory });
const BOARD = { missingOnly: false };

describe("stock report board controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reorder.isPending = false;
  });

  it("opens workers on High and never exposes the Unset bucket", () => {
    mocks.permissions.mockReturnValue(workerPermissions("wood"));
    mocks.list.mockReturnValue(ready());
    const { result } = renderHook(useStockReportBoardController);

    expect(result.current.bucket).toBe("high");
    expect(mocks.list).toHaveBeenCalledWith("high", { majorCategory: "wood", ...BOARD });
    expect(result.current.buckets).not.toContain("unset");
  });

  it("decides Unset then High once on page open, without re-evaluating after the fallback", async () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    mocks.list.mockReturnValue(ready([]));
    const { result, rerender } = renderHook(useStockReportBoardController);

    await waitFor(() => expect(result.current.bucket).toBe("high"));
    mocks.list.mockReturnValue(ready([wirePrioritisedStockReportItem("sri-late", null, null)]));
    rerender();
    expect(result.current.bucket).toBe("high");
  });

  it("targets the dropped-on row's own position, not its place in the visible list", () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    // The owner's real High group, 2026-09-22: positions 1, 3, 4, 5. Position 2
    // belongs to a row with `quantity_requested` of 0, which the list query
    // hides — so the board shows four rows whose indices are not their
    // positions.
    mocks.list.mockReturnValue(ready([
      wirePrioritisedStockReportItem("sri-a", "high", 1),
      wirePrioritisedStockReportItem("sri-b", "high", 3),
      wirePrioritisedStockReportItem("sri-c", "high", 4),
      wirePrioritisedStockReportItem("sri-d", "high", 5),
    ]));
    const { result } = renderHook(useStockReportBoardController);

    act(() => result.current.setBucket("high"));
    act(() => result.current.toggleReorganise());
    result.current.reorder("sri-b", "sri-c");

    // 4, because that is where C is. Index-plus-one would have sent 3 — the
    // position B already held, which the backend answers by doing nothing, and
    // the card springs back on the refetch.
    expect(mocks.reorder.mutate).toHaveBeenCalledWith({ stockNeedId: "sri-b", targetOrder: 4 });
  });

  it("flattens loaded pages for the board and exposes the next-page interaction", async () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    const query = ready([
      wirePrioritisedStockReportItem("sri-a", "high", 1),
      wirePrioritisedStockReportItem("sri-b", "high", 2),
    ], true);
    query.data.pages.push({
      items: [wirePrioritisedStockReportItem("sri-c", "high", 3)],
      hasMore: false,
      limit: 20,
      offset: 20,
    });
    query.data.pageParams.push(20);
    mocks.list.mockReturnValue(query);

    const { result } = renderHook(useStockReportBoardController);
    act(() => result.current.setBucket("high"));

    expect(result.current.cards.map((card) => card.stockNeedId)).toEqual(["sri-a", "sri-b", "sri-c"]);
    expect(result.current.hasMore).toBe(true);
    await result.current.loadMore();
    expect(query.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("pauses drag handles while a page is appending so list geometry cannot move mid-drag", () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    const query = ready([
      wirePrioritisedStockReportItem("sri-a", "high", 1),
      wirePrioritisedStockReportItem("sri-b", "high", 2),
    ], true);
    query.isFetchingNextPage = true;
    mocks.list.mockReturnValue(query);

    const { result } = renderHook(useStockReportBoardController);
    act(() => result.current.setBucket("high"));
    act(() => result.current.toggleReorganise());

    expect(result.current.reorderDisabled).toBe(true);
  });

  it("refuses to guess when the dropped-on row carries no position", () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    mocks.list.mockReturnValue(ready([
      wirePrioritisedStockReportItem("sri-a", "high", 1),
      wirePrioritisedStockReportItem("sri-b", "high", null),
    ]));
    const { result } = renderHook(useStockReportBoardController);

    act(() => result.current.setBucket("high"));
    act(() => result.current.toggleReorganise());
    result.current.reorder("sri-a", "sri-b");

    expect(mocks.reorder.mutate).not.toHaveBeenCalled();
  });

  it("permits reorder only for a complete non-Unset bucket and disables it while pending", () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    mocks.list.mockReturnValue(ready([
      wirePrioritisedStockReportItem("sri-1", "high", 1),
      wirePrioritisedStockReportItem("sri-2", "high", 2),
    ]));
    const { result } = renderHook(useStockReportBoardController);

    act(() => result.current.toggleReorganise());
    result.current.reorder("sri-1", "sri-2");
    expect(mocks.reorder.mutate).not.toHaveBeenCalled();
    act(() => result.current.setBucket("high"));
    result.current.reorder("sri-1", "sri-2");
    expect(mocks.reorder.mutate).toHaveBeenCalledWith({ stockNeedId: "sri-1", targetOrder: 2 });
    result.current.openDetail("sri-1");
    expect(mocks.open).toHaveBeenCalledWith("stock-report-detail-slide", { stockNeedId: "sri-1" });
    expect(result.current.isReorganiseMode).toBe(true);
    act(() => result.current.setSearchValue("chair"));
    expect(result.current.reorderDisabled).toBe(true);
  });

  it("keeps a schema-mismatch report off the board and passes a backend sentence through", () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    // W-1: the zod dump is diagnostic, the board shows its own generic copy.
    mocks.list.mockReturnValue(failed(new ApiRequestError(502, "invalid_response", "API response did not match expected schema: …")));
    expect(renderHook(useStockReportBoardController).result.current.errorMessage).toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    mocks.list.mockReturnValue(failed(new ApiRequestError(503, "service_unavailable", "Stock report is temporarily unavailable.")));
    expect(renderHook(useStockReportBoardController).result.current.errorMessage).toBe("Stock report is temporarily unavailable.");
    consoleError.mockRestore();
  });

  /**
   * Workers work one kind of item, so the board opens on their category — that
   * is their normal view, so the badge stays off. Managers open unfiltered
   * (owner, 2026-09-22).
   */
  it("opens on the role's major category without counting the default as a filter", () => {
    mocks.list.mockReturnValue(ready());

    mocks.permissions.mockReturnValue(workerPermissions("seat"));
    const upholsterer = renderHook(useStockReportBoardController).result.current;
    expect(upholsterer.filter).toEqual({ majorCategory: "seat", ...BOARD });
    expect(upholsterer.activeFilterCount).toBe(0);
    expect(mocks.list).toHaveBeenLastCalledWith("high", { majorCategory: "seat", ...BOARD });

    mocks.permissions.mockReturnValue(managerPermissions);
    const manager = renderHook(useStockReportBoardController).result.current;
    expect(manager.filter).toEqual({ majorCategory: null, ...BOARD });
    expect(manager.activeFilterCount).toBe(0);
    // The first request is the opening Unset one; the empty reply then moves
    // the board to High, so "last" would already be the fallback.
    expect(mocks.list).toHaveBeenCalledWith("unset", { majorCategory: null, ...BOARD });
  });

  it("opens the filter sheet with the applied value and the role default, and applies what comes back", () => {
    mocks.permissions.mockReturnValue(workerPermissions("wood"));
    mocks.list.mockReturnValue(ready());
    const { result } = renderHook(useStockReportBoardController);

    result.current.openFilter();
    expect(mocks.open).toHaveBeenCalledWith("stock-report-filter-sheet", expect.objectContaining({ current: "wood", initial: "wood" }));

    const { onApply } = mocks.open.mock.calls[0]?.[1] as { onApply: (value: "wood" | "seat" | null) => void };
    act(() => onApply(null));
    expect(result.current.filter).toEqual({ majorCategory: null, ...BOARD });
    // "All" is a departure from this worker's default, so the badge shows.
    expect(result.current.activeFilterCount).toBe(1);
    expect(mocks.list).toHaveBeenLastCalledWith("high", { majorCategory: null, ...BOARD });

    // Back to the default: the badge goes away again.
    act(() => onApply("wood"));
    expect(result.current.activeFilterCount).toBe(0);

    // Switching bucket keeps the applied filter.
    act(() => result.current.setBucket("low"));
    expect(mocks.list).toHaveBeenLastCalledWith("low", { majorCategory: "wood", ...BOARD });
  });

  /**
   * The missing page (owner, 2026-09-26): the same controller with
   * `missing_only` on the wire, opening on All, where every card shows and
   * nothing can be dragged.
   */
  describe("missing mode", () => {
    it("opens on All with missing_only set and offers no Unset bucket", () => {
      mocks.permissions.mockReturnValue(managerPermissions);
      mocks.list.mockReturnValue(ready([]));
      const { result } = renderHook(() => useStockReportBoardController({ mode: "missing" }));

      expect(result.current.bucket).toBe("all");
      expect(result.current.buckets).toEqual(["all", "high", "medium", "low"]);
      expect(mocks.list).toHaveBeenCalledWith("all", { majorCategory: null, missingOnly: true });
      // No Unset-empty fallback: All stays All even when the reply is empty.
      expect(result.current.bucket).toBe("all");
    });

    it("keeps every row's card in All, labelled per row, and refuses to reorder there", () => {
      mocks.permissions.mockReturnValue(managerPermissions);
      mocks.list.mockReturnValue(ready([
        wirePrioritisedStockReportItem("sri-a", "high", 1),
        wirePrioritisedStockReportItem("sri-b", null, null),
        wirePrioritisedStockReportItem("sri-c", "low", 2),
      ]));
      const { result } = renderHook(() => useStockReportBoardController({ mode: "missing" }));

      expect(result.current.cards.map((card) => [card.stockNeedId, card.hasPriority])).toEqual([["sri-a", true], ["sri-b", false], ["sri-c", true]]);
      act(() => result.current.toggleReorganise());
      expect(result.current.reorderDisabled).toBe(true);
      result.current.reorder("sri-a", "sri-c");
      expect(mocks.reorder.mutate).not.toHaveBeenCalled();

      // A priority bucket inside missing mode works like the board's.
      act(() => result.current.setBucket("high"));
      expect(mocks.list).toHaveBeenLastCalledWith("high", { majorCategory: null, missingOnly: true });
      expect(result.current.cards.map((card) => card.stockNeedId)).toEqual(["sri-a"]);
    });

    it("keeps missing_only when the category filter changes", () => {
      mocks.permissions.mockReturnValue(managerPermissions);
      mocks.list.mockReturnValue(ready());
      const { result } = renderHook(() => useStockReportBoardController({ mode: "missing" }));

      result.current.openFilter();
      const { onApply } = mocks.open.mock.calls[0]?.[1] as { onApply: (value: "wood" | "seat" | null) => void };
      act(() => onApply("wood"));
      expect(mocks.list).toHaveBeenLastCalledWith("all", { majorCategory: "wood", missingOnly: true });
    });
  });

  it("reads the priority sheet's current value and the drop target's position from the snapshot", () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    mocks.list.mockReturnValue(ready([wirePrioritisedStockReportItem("sri-a", "high", 7)]));
    const { result } = renderHook(useStockReportBoardController);

    act(() => result.current.setBucket("high"));
    result.current.openPriority("sri-a");
    expect(mocks.open).toHaveBeenLastCalledWith("stock-report-priority-sheet", expect.objectContaining({ current: "high" }));
    const { onSelect } = mocks.open.mock.calls.at(-1)?.[1] as { onSelect: (value: "high" | "low" | null) => void };
    onSelect("high");
    expect(mocks.setPriority.mutate).not.toHaveBeenCalled();
    onSelect("low");
    expect(mocks.setPriority.mutate).toHaveBeenCalledWith({ stockNeedId: "sri-a", priority: "low" });
  });
});
