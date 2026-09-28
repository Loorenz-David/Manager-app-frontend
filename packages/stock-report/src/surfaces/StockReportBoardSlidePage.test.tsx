import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ activeVersion: vi.fn(), open: vi.fn(), setTitle: vi.fn(), setHeaderHidden: vi.fn(), canManageVersions: false }));

vi.mock("@beyo/hooks", () => ({
  useSurface: () => ({ open: mocks.open }),
  useSurfaceHeader: () => ({ setTitle: mocks.setTitle, setActions: vi.fn(), requestClose: vi.fn(), setHeaderHidden: mocks.setHeaderHidden }),
}));
vi.mock("../api/use-stock-report-queries", () => ({ useStockReportActiveVersionQuery: mocks.activeVersion }));
vi.mock("../controllers/use-stock-report-board-controller", () => ({
  useStockReportBoardController: () => ({
    permissions: { canPrioritise: false, canManageVersions: mocks.canManageVersions },
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
import { formatVersionDayTitle } from "../lib/version-format";
import { StockReportBoardSlidePage, stockReportBoardTitle } from "./StockReportBoardSlidePage";

describe("StockReportBoardSlidePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canManageVersions = false;
  });
  afterEach(cleanup);

  /** OC-18: the version's own title, else the day it was created. */
  it("titles the board by its version — the title when it has one, else the creation day — in both the surface and the in-scroll row", () => {
    const createdAt = new Date(new Date().getFullYear(), 8, 24, 9).toISOString();
    mocks.activeVersion.mockReturnValue({ data: wireStockReportSnapshotVersion({ created_at: createdAt, title: null }) });
    render(<StockReportBoardSlidePage />);

    const dayTitle = formatVersionDayTitle(createdAt);
    expect(mocks.setTitle).toHaveBeenCalledWith(dayTitle);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(dayTitle);
    expect(mocks.setHeaderHidden).toHaveBeenCalledWith(true);

    expect(stockReportBoardTitle(wireStockReportSnapshotVersion({ title: "Autumn run" }))).toBe("Autumn run");
  });

  it("stands the title alone while the version is unknown", () => {
    mocks.activeVersion.mockReturnValue({ data: undefined });
    render(<StockReportBoardSlidePage />);

    expect(mocks.setTitle).toHaveBeenCalledWith("Stock requested");
    expect(stockReportBoardTitle(null)).toBe("Stock requested");
    expect(stockReportBoardTitle(undefined)).toBe("Stock requested");
  });

  /** OC-3: the active version's ⋮, for the roles that manage versions, once the version is known. */
  it("offers the version's ⋮ to managers once the active version is known, and to nobody else", () => {
    mocks.canManageVersions = true;
    mocks.activeVersion.mockReturnValue({ data: undefined });
    render(<StockReportBoardSlidePage />);
    expect(screen.queryByTestId("stock-report-board-menu")).not.toBeInTheDocument();

    cleanup();
    mocks.activeVersion.mockReturnValue({ data: wireStockReportSnapshotVersion({ client_id: "srv-1" }) });
    render(<StockReportBoardSlidePage />);
    fireEvent.click(screen.getByTestId("stock-report-board-menu"));
    expect(mocks.open).toHaveBeenCalledWith("stock-report-version-actions-sheet", { versionId: "srv-1" });

    cleanup();
    mocks.canManageVersions = false;
    render(<StockReportBoardSlidePage />);
    expect(screen.queryByTestId("stock-report-board-menu")).not.toBeInTheDocument();
  });
});
