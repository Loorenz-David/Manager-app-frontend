import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ activeVersion: vi.fn(), setTitle: vi.fn(), setHeaderHidden: vi.fn() }));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({ setTitle: mocks.setTitle, setActions: vi.fn(), requestClose: vi.fn(), setHeaderHidden: mocks.setHeaderHidden }),
}));
vi.mock("../api/use-stock-report-queries", () => ({ useStockReportActiveVersionQuery: mocks.activeVersion }));
vi.mock("../controllers/use-stock-report-board-controller", () => ({
  useStockReportBoardController: () => ({
    permissions: { canPrioritise: false },
    bucket: "high",
    buckets: ["high", "medium", "low"],
    cards: [],
    status: "ready",
    activeFilterCount: 0,
    hasMore: false,
    isLoadingMore: false,
    isReorganiseMode: false,
    reorderDisabled: false,
    searchValue: "",
  }),
}));
// The board itself is covered by its own tests; here only the header slot matters.
vi.mock("../components/board/StockReportBoardView", () => ({
  StockReportBoardView: ({ header }: { header: React.ReactNode }) => <div>{header}</div>,
}));

import { wireStockReportSnapshotVersion } from "../fixtures/stock-report-wire-fixtures";
import { StockReportBoardSlidePage, stockReportBoardTitle } from "./StockReportBoardSlidePage";

describe("StockReportBoardSlidePage", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("titles the board by the day its version opened, in both the surface and the in-scroll row", () => {
    const activeAt = new Date(new Date().getFullYear(), 8, 24, 9).toISOString();
    mocks.activeVersion.mockReturnValue({ data: wireStockReportSnapshotVersion({ active_at: activeAt }) });
    render(<StockReportBoardSlidePage />);

    expect(mocks.setTitle).toHaveBeenCalledWith("Stock requested 09-24");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Stock requested 09-24");
    expect(mocks.setHeaderHidden).toHaveBeenCalledWith(true);
  });

  it("stands the title alone while the version is unknown", () => {
    mocks.activeVersion.mockReturnValue({ data: undefined });
    render(<StockReportBoardSlidePage />);

    expect(mocks.setTitle).toHaveBeenCalledWith("Stock requested");
    expect(stockReportBoardTitle(null)).toBe("Stock requested");
    expect(stockReportBoardTitle("not a date")).toBe("Stock requested");
  });
});
