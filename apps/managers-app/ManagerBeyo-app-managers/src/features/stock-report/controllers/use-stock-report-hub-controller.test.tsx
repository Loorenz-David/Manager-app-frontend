import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  preload: vi.fn(),
  activeVersion: vi.fn(),
  missingSummary: vi.fn(),
  draftCount: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/hooks/use-surface", () => ({ useSurface: () => ({ open: mocks.open }) }));
vi.mock("@/hooks/use-preload-surface", () => ({ usePreloadSurface: mocks.preload }));
vi.mock("@beyo/stock-report", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/stock-report")>()),
  useStockReportPermissions: () => ({ canManageVersions: true }),
  useStockReportActiveVersionQuery: mocks.activeVersion,
  useStockReportMissingSummaryQuery: mocks.missingSummary,
  useStockReportDraftCountQuery: mocks.draftCount,
  useCreateStockReportVersion: mocks.create,
}));

import {
  STOCK_REPORT_BOARD_SURFACE_ID,
  STOCK_REPORT_DRAFTS_SURFACE_ID,
  STOCK_REPORT_MISSING_SURFACE_ID,
  STOCK_REPORT_VERSION_FORM_SURFACE_ID,
  STOCK_REPORT_VERSION_HISTORY_SURFACE_ID,
  preloadStockReportBoardSurface,
  preloadStockReportDraftsSurface,
  preloadStockReportMissingSurface,
  preloadStockReportVersionFormSurface,
  preloadStockReportVersionHistorySurface,
} from "@beyo/stock-report";

import { useStockReportHubController } from "./use-stock-report-hub-controller";

const ready = (data: unknown) => ({ data, isPending: false, isError: false, error: null, refetch: vi.fn().mockResolvedValue(undefined) });
const pending = () => ({ data: undefined, isPending: true, isError: false, error: null, refetch: vi.fn().mockResolvedValue(undefined) });

describe("useStockReportHubController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeVersion.mockReturnValue(ready(null));
    mocks.missingSummary.mockReturnValue(ready({ quantity_missing_total: 2, items_with_missing: 1 }));
    mocks.draftCount.mockReturnValue(ready(4));
  });

  it("preloads the five surfaces and opens each by its package id", () => {
    const { result } = renderHook(useStockReportHubController);

    for (const preload of [
      preloadStockReportBoardSurface,
      preloadStockReportMissingSurface,
      preloadStockReportVersionHistorySurface,
      preloadStockReportDraftsSurface,
      preloadStockReportVersionFormSurface,
    ]) {
      expect(mocks.preload).toHaveBeenCalledWith(preload);
    }
    result.current.openBoard();
    result.current.openMissing();
    result.current.openHistory();
    result.current.openDrafts();
    result.current.openCreateForm();
    expect(mocks.open).toHaveBeenNthCalledWith(1, STOCK_REPORT_BOARD_SURFACE_ID, {});
    expect(mocks.open).toHaveBeenNthCalledWith(2, STOCK_REPORT_MISSING_SURFACE_ID, {});
    expect(mocks.open).toHaveBeenNthCalledWith(3, STOCK_REPORT_VERSION_HISTORY_SURFACE_ID, {});
    expect(mocks.open).toHaveBeenNthCalledWith(4, STOCK_REPORT_DRAFTS_SURFACE_ID, {});
    // A create form: no version id.
    expect(mocks.open).toHaveBeenNthCalledWith(5, STOCK_REPORT_VERSION_FORM_SURFACE_ID, {});
    expect(result.current.missingSummary).toEqual({ quantity_missing_total: 2, items_with_missing: 1 });
    // §5.12: no version yet is a ready null, not an error.
    expect(result.current.version).toBeNull();
    expect(result.current.versionStatus).toBe("ready");
  });

  it("passes the draft count through, undefined until it has loaded", () => {
    const { result, rerender } = renderHook(useStockReportHubController);
    expect(result.current.draftCount).toBe(4);

    mocks.draftCount.mockReturnValue(pending());
    rerender();
    expect(result.current.draftCount).toBeUndefined();
  });

  /** OC-2: creating is the form's; the hub holds no create mutation. */
  it("creates nothing itself", () => {
    const { result } = renderHook(useStockReportHubController);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(result.current).not.toHaveProperty("createVersion");
    expect(result.current).not.toHaveProperty("createPhase");
  });
});
