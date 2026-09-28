import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  versions: vi.fn(),
  open: vi.fn(),
  setTitle: vi.fn(),
  requestClose: vi.fn(),
  canManageVersions: true,
}));

vi.mock("@beyo/hooks", () => ({
  usePreloadSurface: vi.fn(),
  useSurface: () => ({ open: mocks.open }),
  useSurfaceHeader: () => ({ setTitle: mocks.setTitle, setActions: vi.fn(), requestClose: mocks.requestClose, setHeaderHidden: vi.fn() }),
}));
vi.mock("@beyo/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/ui")>()),
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../api/use-stock-report-queries", () => ({ useStockReportVersionsQuery: mocks.versions }));
vi.mock("../lib/use-stock-report-permissions", () => ({
  useStockReportPermissions: () => ({ canManageVersions: mocks.canManageVersions }),
}));

import { wireDraftStockReportSnapshotVersion } from "../fixtures/stock-report-wire-fixtures";
import { StockReportDraftsSlidePage } from "./StockReportDraftsSlidePage";

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
const page = (versions: unknown[]) => ({ pages: [{ versions, hasMore: false, limit: 20, offset: 0 }] });

describe("StockReportDraftsSlidePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canManageVersions = true;
  });
  afterEach(cleanup);

  it("reads the drafts only and lists each one", () => {
    mocks.versions.mockReturnValue(query({ data: page([wireDraftStockReportSnapshotVersion({ client_id: "srv-a" }), wireDraftStockReportSnapshotVersion({ client_id: "srv-b" })]) }));
    render(<StockReportDraftsSlidePage />);

    expect(mocks.versions).toHaveBeenCalledWith({ states: ["draft"] });
    expect(mocks.setTitle).toHaveBeenCalledWith("Draft versions");
    expect(screen.getByTestId("stock-report-drafts")).toBeInTheDocument();
    expect(screen.getByTestId("stock-draft-card-srv-a")).toBeInTheDocument();
    expect(screen.getByTestId("stock-draft-card-srv-b")).toBeInTheDocument();
  });

  it("opens a draft's board from its card and its actions from its ⋮", () => {
    mocks.versions.mockReturnValue(query({ data: page([wireDraftStockReportSnapshotVersion({ client_id: "srv-a" })]) }));
    render(<StockReportDraftsSlidePage />);

    fireEvent.click(screen.getByTestId("stock-draft-card-srv-a"));
    expect(mocks.open).toHaveBeenCalledWith("stock-report-draft-board-slide", { versionId: "srv-a" });
    fireEvent.click(screen.getByTestId("stock-draft-card-menu-srv-a"));
    expect(mocks.open).toHaveBeenCalledWith("stock-report-version-actions-sheet", { versionId: "srv-a" });
    fireEvent.click(screen.getByTestId("stock-report-drafts-back"));
    expect(mocks.requestClose).toHaveBeenCalled();
  });

  it("hides the ⋮ from the roles that cannot manage versions", () => {
    mocks.canManageVersions = false;
    mocks.versions.mockReturnValue(query({ data: page([wireDraftStockReportSnapshotVersion({ client_id: "srv-a" })]) }));
    render(<StockReportDraftsSlidePage />);
    expect(screen.queryByTestId("stock-draft-card-menu-srv-a")).not.toBeInTheDocument();
  });

  it("says there are no drafts yet, and offers a retry on failure", () => {
    mocks.versions.mockReturnValue(query({ data: page([]) }));
    render(<StockReportDraftsSlidePage />);
    expect(screen.getByTestId("stock-version-list-empty")).toHaveTextContent("No drafts yet — create one from the stock page.");
    cleanup();

    const refetch = vi.fn().mockResolvedValue(undefined);
    mocks.versions.mockReturnValue(query({ isSuccess: false, isError: true, error: new Error("boom"), refetch }));
    render(<StockReportDraftsSlidePage />);
    fireEvent.click(screen.getByTestId("stock-version-list-error-retry"));
    expect(refetch).toHaveBeenCalled();
  });
});
