import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ versions: vi.fn(), setTitle: vi.fn(), requestClose: vi.fn(), setHeaderHidden: vi.fn() }));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({ setTitle: mocks.setTitle, setActions: vi.fn(), requestClose: mocks.requestClose, setHeaderHidden: mocks.setHeaderHidden }),
}));
vi.mock("@beyo/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/ui")>()),
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StatePill: ({ label }: { label: string }) => <span>{label}</span>,
}));
vi.mock("../api/use-stock-report-queries", () => ({ useStockReportVersionsQuery: mocks.versions }));

import { wireStockReportSnapshotVersion } from "../fixtures/stock-report-wire-fixtures";
import { StockReportVersionHistorySlidePage } from "./StockReportVersionHistorySlidePage";

const query = (overrides: Record<string, unknown>) => ({
  data: undefined,
  isPending: false,
  isError: false,
  isSuccess: true,
  error: null,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
  refetch: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("StockReportVersionHistorySlidePage", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("titles the surface and lists every page's versions newest first with a load-more control", () => {
    const fetchNextPage = vi.fn();
    mocks.versions.mockReturnValue(query({
      data: { pages: [
        { versions: [wireStockReportSnapshotVersion({ client_id: "srv-3" }), wireStockReportSnapshotVersion({ client_id: "srv-2", closed_at: "2026-09-24T08:00:00+00:00" })], hasMore: true, limit: 2, offset: 0 },
        { versions: [wireStockReportSnapshotVersion({ client_id: "srv-1", closed_at: "2026-09-20T08:00:00+00:00" })], hasMore: true, limit: 2, offset: 2 },
      ] },
      hasNextPage: true,
      fetchNextPage,
    }));
    render(<StockReportVersionHistorySlidePage />);

    expect(mocks.setTitle).toHaveBeenCalledWith("Version history");
    // The surface's fixed header is muted; the page's own back row sits
    // inside the scroll content and closes through the animated path.
    expect(mocks.setHeaderHidden).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByTestId("stock-report-version-history-back"));
    expect(mocks.requestClose).toHaveBeenCalled();
    const ids = Array.from(screen.getByTestId("stock-version-list").children).map((node) => node.getAttribute("data-testid"));
    expect(ids).toEqual(["stock-version-card-srv-3", "stock-version-card-srv-2", "stock-version-card-srv-1"]);
    fireEvent.click(screen.getByTestId("stock-version-list-load-more"));
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it("shows the empty state before the first version and the error state with retry", () => {
    mocks.versions.mockReturnValue(query({ data: { pages: [{ versions: [], hasMore: false, limit: 20, offset: 0 }] } }));
    render(<StockReportVersionHistorySlidePage />);
    expect(screen.getByTestId("stock-version-list-empty")).toBeInTheDocument();
    cleanup();

    const refetch = vi.fn().mockResolvedValue(undefined);
    mocks.versions.mockReturnValue(query({ isSuccess: false, isError: true, error: new Error("boom"), refetch }));
    render(<StockReportVersionHistorySlidePage />);
    expect(screen.getByTestId("stock-version-list-error")).toHaveTextContent("boom");
    fireEvent.click(screen.getByTestId("stock-version-list-error-retry"));
    expect(refetch).toHaveBeenCalled();
  });
});
