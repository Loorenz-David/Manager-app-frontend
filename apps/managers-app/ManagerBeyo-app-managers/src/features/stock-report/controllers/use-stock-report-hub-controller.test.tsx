import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  preload: vi.fn(),
  activeVersion: vi.fn(),
  missingSummary: vi.fn(),
  draftCount: vi.fn(),
  create: vi.fn(),
  mutate: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("@/hooks/use-surface", () => ({ useSurface: () => ({ open: mocks.open }) }));
vi.mock("@/hooks/use-preload-surface", () => ({ usePreloadSurface: mocks.preload }));
vi.mock("@beyo/lib", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/lib")>()),
  notify: { error: mocks.notifyError, success: vi.fn() },
}));
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
  STOCK_REPORT_DRAFT_BOARD_SURFACE_ID,
  STOCK_REPORT_DRAFTS_SURFACE_ID,
  STOCK_REPORT_MISSING_SURFACE_ID,
  STOCK_REPORT_VERSION_HISTORY_SURFACE_ID,
  newStockDraftBody,
  preloadStockReportBoardSurface,
  preloadStockReportDraftBoardSurface,
  preloadStockReportDraftsSurface,
  preloadStockReportMissingSurface,
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
    mocks.create.mockReturnValue({ mutate: mocks.mutate, isPending: false });
  });

  it("preloads the five surfaces and opens each by its package id", () => {
    const { result } = renderHook(useStockReportHubController);

    for (const preload of [
      preloadStockReportBoardSurface,
      preloadStockReportMissingSurface,
      preloadStockReportVersionHistorySurface,
      preloadStockReportDraftsSurface,
      preloadStockReportDraftBoardSurface,
    ]) {
      expect(mocks.preload).toHaveBeenCalledWith(preload);
    }
    result.current.openBoard();
    result.current.openMissing();
    result.current.openHistory();
    result.current.openDrafts();
    expect(mocks.open).toHaveBeenNthCalledWith(1, STOCK_REPORT_BOARD_SURFACE_ID, {});
    expect(mocks.open).toHaveBeenNthCalledWith(2, STOCK_REPORT_MISSING_SURFACE_ID, {});
    expect(mocks.open).toHaveBeenNthCalledWith(3, STOCK_REPORT_VERSION_HISTORY_SURFACE_ID, {});
    expect(mocks.open).toHaveBeenNthCalledWith(4, STOCK_REPORT_DRAFTS_SURFACE_ID, {});
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

  /** Owner, 2026-09-28: + New Draft sends what an untouched create form would, in one tap. */
  it("creates a draft under today's placeholder title and opens its board", () => {
    const { result } = renderHook(useStockReportHubController);
    act(() => result.current.createDraft());

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    const [body, options] = mocks.mutate.mock.calls[0]!;
    expect(body).toEqual(newStockDraftBody(Date.now()));
    expect(body).toEqual({ draft: true, title: expect.any(String) });
    expect(mocks.open).not.toHaveBeenCalled();

    options.onSuccess({ client_id: "srv_new" });
    expect(mocks.open).toHaveBeenCalledWith(STOCK_REPORT_DRAFT_BOARD_SURFACE_ID, { versionId: "srv_new" });
  });

  it("toasts a failed create and opens nothing", () => {
    const { result } = renderHook(useStockReportHubController);
    act(() => result.current.createDraft());

    mocks.mutate.mock.calls[0]![1].onError(new Error("boom"));
    expect(mocks.notifyError).toHaveBeenCalledWith("Draft not created", expect.any(String));
    expect(mocks.open).not.toHaveBeenCalled();
  });

  it("sends nothing while a create is already in flight", () => {
    mocks.create.mockReturnValue({ mutate: mocks.mutate, isPending: true });
    const { result } = renderHook(useStockReportHubController);
    expect(result.current.isCreatingDraft).toBe(true);

    act(() => result.current.createDraft());
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
