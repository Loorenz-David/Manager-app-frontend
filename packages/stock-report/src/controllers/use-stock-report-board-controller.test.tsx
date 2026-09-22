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
vi.mock("../surface-ids", () => ({ preloadStockReportDetailSurface: vi.fn(), STOCK_REPORT_DETAIL_SURFACE_ID: "stock-report-detail-slide", STOCK_REPORT_PRIORITY_SURFACE_ID: "stock-report-priority-sheet" }));

import { useStockReportBoardController } from "./use-stock-report-board-controller";

const ready = (data: unknown[] = []) => ({ data, isSuccess: true, isPending: false, isError: false, error: null, refetch: vi.fn() });

describe("stock report board controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reorder.isPending = false;
  });

  it("opens workers on High and never exposes the Unset bucket", () => {
    mocks.permissions.mockReturnValue({ canPrioritise: false, canAssign: true, seesUnset: false, buckets: ["high", "medium", "low"], isWorker: true });
    mocks.list.mockReturnValue(ready());
    const { result } = renderHook(useStockReportBoardController);

    expect(result.current.bucket).toBe("high");
    expect(mocks.list).toHaveBeenCalledWith("high");
    expect(result.current.permissions.buckets).not.toContain("unset");
  });

  it("decides Unset then High once on page open, without re-evaluating after the fallback", async () => {
    mocks.permissions.mockReturnValue({ canPrioritise: true, canAssign: true, seesUnset: true, buckets: ["unset", "high", "medium", "low"], isWorker: false });
    mocks.list.mockReturnValue(ready([]));
    const { result, rerender } = renderHook(useStockReportBoardController);

    await waitFor(() => expect(result.current.bucket).toBe("high"));
    mocks.list.mockReturnValue(ready([{ client_id: "sri-late", item_category: null, priority: null }]));
    rerender();
    expect(result.current.bucket).toBe("high");
  });

  it("permits reorder only for a complete non-Unset bucket and disables it while pending", () => {
    mocks.permissions.mockReturnValue({ canPrioritise: true, canAssign: true, seesUnset: true, buckets: ["unset", "high", "medium", "low"], isWorker: false });
    mocks.list.mockReturnValue(ready([{ client_id: "sri-1", item_category: null, priority: "high" }]));
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
});
