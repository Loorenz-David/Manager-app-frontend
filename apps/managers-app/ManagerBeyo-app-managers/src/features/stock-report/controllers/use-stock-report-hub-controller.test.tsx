import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  preload: vi.fn(),
  activeVersion: vi.fn(),
  missingSummary: vi.fn(),
  create: { mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, error: null as unknown },
}));

vi.mock("@/hooks/use-surface", () => ({ useSurface: () => ({ open: mocks.open }) }));
vi.mock("@/hooks/use-preload-surface", () => ({ usePreloadSurface: mocks.preload }));
vi.mock("@beyo/stock-report", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/stock-report")>()),
  useStockReportPermissions: () => ({ canManageVersions: true }),
  useStockReportActiveVersionQuery: mocks.activeVersion,
  useStockReportMissingSummaryQuery: mocks.missingSummary,
  useCreateStockReportVersion: () => mocks.create,
}));

import { ApiRequestError } from "@beyo/api-client";
import {
  STOCK_REPORT_BOARD_SURFACE_ID,
  STOCK_REPORT_MISSING_SURFACE_ID,
  STOCK_REPORT_VERSION_HISTORY_SURFACE_ID,
  preloadStockReportBoardSurface,
  preloadStockReportMissingSurface,
  preloadStockReportVersionHistorySurface,
} from "@beyo/stock-report";

import { useStockReportHubController } from "./use-stock-report-hub-controller";

const ready = (data: unknown) => ({ data, isPending: false, isError: false, error: null, refetch: vi.fn().mockResolvedValue(undefined) });

describe("useStockReportHubController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.isPending = false;
    mocks.create.isError = false;
    mocks.create.error = null;
    mocks.activeVersion.mockReturnValue(ready(null));
    mocks.missingSummary.mockReturnValue(ready({ quantity_missing_total: 2, items_with_missing: 1 }));
  });

  it("preloads the three slides and opens them by their package ids", () => {
    const { result } = renderHook(useStockReportHubController);

    expect(mocks.preload).toHaveBeenCalledWith(preloadStockReportBoardSurface);
    expect(mocks.preload).toHaveBeenCalledWith(preloadStockReportMissingSurface);
    expect(mocks.preload).toHaveBeenCalledWith(preloadStockReportVersionHistorySurface);
    result.current.openBoard();
    result.current.openMissing();
    result.current.openHistory();
    expect(mocks.open).toHaveBeenNthCalledWith(1, STOCK_REPORT_BOARD_SURFACE_ID, {});
    expect(mocks.open).toHaveBeenNthCalledWith(2, STOCK_REPORT_MISSING_SURFACE_ID, {});
    expect(mocks.open).toHaveBeenNthCalledWith(3, STOCK_REPORT_VERSION_HISTORY_SURFACE_ID, {});
    expect(result.current.missingSummary).toEqual({ quantity_missing_total: 2, items_with_missing: 1 });
    // §5.12: no version yet is a ready null, not an error.
    expect(result.current.version).toBeNull();
    expect(result.current.versionStatus).toBe("ready");
  });

  it("hands the success callback to the mutation and derives the overlay phase from it", () => {
    const { result, rerender } = renderHook(useStockReportHubController);
    const onCreated = vi.fn();

    result.current.createVersion(onCreated);
    expect(mocks.create.mutate).toHaveBeenCalledWith(undefined, { onSuccess: onCreated });
    expect(result.current.createPhase).toBe("idle");

    mocks.create.isPending = true;
    rerender();
    expect(result.current.createPhase).toBe("creating");

    mocks.create.isPending = false;
    mocks.create.isError = true;
    mocks.create.error = new ApiRequestError(503, "service_unavailable", "Stock report is temporarily unavailable.");
    rerender();
    expect(result.current.createPhase).toBe("failed");
    expect(result.current.createErrorMessage).toBe("Stock report is temporarily unavailable.");
    result.current.dismissCreateFailure();
    expect(mocks.create.reset).toHaveBeenCalled();
  });
});
