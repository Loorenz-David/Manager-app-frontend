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
import { wireStockReportItem } from "../fixtures/stock-report-wire-fixtures";
import { useStockReportBoardController } from "./use-stock-report-board-controller";

const ready = (data: unknown[] = []) => ({ data, isSuccess: true, isPending: false, isError: false, error: null, refetch: vi.fn() });
const failed = (error: Error) => ({ data: undefined, isSuccess: false, isPending: false, isError: true, error, refetch: vi.fn() });
const managerPermissions = { canPrioritise: true, canAssign: true, seesUnset: true, buckets: ["unset", "high", "medium", "low"], isWorker: false, defaultMajorCategory: null };
const workerPermissions = (defaultMajorCategory: "wood" | "seat") => ({ canPrioritise: false, canAssign: defaultMajorCategory === "wood", seesUnset: false, buckets: ["high", "medium", "low"], isWorker: true, defaultMajorCategory });

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
    expect(mocks.list).toHaveBeenCalledWith("high", { majorCategory: "wood" });
    expect(result.current.permissions.buckets).not.toContain("unset");
  });

  it("decides Unset then High once on page open, without re-evaluating after the fallback", async () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    mocks.list.mockReturnValue(ready([]));
    const { result, rerender } = renderHook(useStockReportBoardController);

    await waitFor(() => expect(result.current.bucket).toBe("high"));
    mocks.list.mockReturnValue(ready([wireStockReportItem({ client_id: "sri-late", priority: null, priority_order: null })]));
    rerender();
    expect(result.current.bucket).toBe("high");
  });

  it("permits reorder only for a complete non-Unset bucket and disables it while pending", () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    mocks.list.mockReturnValue(ready([wireStockReportItem({ client_id: "sri-1", priority: "high" })]));
    const { result } = renderHook(useStockReportBoardController);

    act(() => result.current.toggleReorganise());
    result.current.reorder("sri-1", 0);
    expect(mocks.reorder.mutate).not.toHaveBeenCalled();
    act(() => result.current.setBucket("high"));
    result.current.reorder("sri-1", 1);
    expect(mocks.reorder.mutate).toHaveBeenCalledWith({ stockNeedId: "sri-1", toIndex: 1 });
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
    expect(upholsterer.filter).toEqual({ majorCategory: "seat" });
    expect(upholsterer.activeFilterCount).toBe(0);
    expect(mocks.list).toHaveBeenLastCalledWith("high", { majorCategory: "seat" });

    mocks.permissions.mockReturnValue(managerPermissions);
    const manager = renderHook(useStockReportBoardController).result.current;
    expect(manager.filter).toEqual({ majorCategory: null });
    expect(manager.activeFilterCount).toBe(0);
    // The first request is the opening Unset one; the empty reply then moves
    // the board to High, so "last" would already be the fallback.
    expect(mocks.list).toHaveBeenCalledWith("unset", { majorCategory: null });
  });

  it("opens the filter sheet with the applied value and the role default, and applies what comes back", () => {
    mocks.permissions.mockReturnValue(workerPermissions("wood"));
    mocks.list.mockReturnValue(ready());
    const { result } = renderHook(useStockReportBoardController);

    result.current.openFilter();
    expect(mocks.open).toHaveBeenCalledWith("stock-report-filter-sheet", expect.objectContaining({ current: "wood", initial: "wood" }));

    const { onApply } = mocks.open.mock.calls[0]?.[1] as { onApply: (value: "wood" | "seat" | null) => void };
    act(() => onApply(null));
    expect(result.current.filter).toEqual({ majorCategory: null });
    // "All" is a departure from this worker's default, so the badge shows.
    expect(result.current.activeFilterCount).toBe(1);
    expect(mocks.list).toHaveBeenLastCalledWith("high", { majorCategory: null });

    // Back to the default: the badge goes away again.
    act(() => onApply("wood"));
    expect(result.current.activeFilterCount).toBe(0);

    // Switching bucket keeps the applied filter.
    act(() => result.current.setBucket("low"));
    expect(mocks.list).toHaveBeenLastCalledWith("low", { majorCategory: "wood" });
  });
});
