import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  version: vi.fn(),
  open: vi.fn(),
  closeMany: vi.fn(),
  setTitle: vi.fn(),
  stack: [] as { id: string }[],
  canManageVersions: true,
  controllerOptions: vi.fn(),
}));
const notify = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), success: vi.fn() }));

vi.mock("@beyo/hooks", () => ({
  useSurface: () => ({ open: mocks.open, closeMany: mocks.closeMany }),
  useSurfaceHeader: () => ({ setTitle: mocks.setTitle, setActions: vi.fn(), requestClose: vi.fn(), setHeaderHidden: vi.fn() }),
  useSurfaceProps: () => ({ versionId: "srv-draft" }),
}));
vi.mock("@beyo/ui", async (importOriginal) => ({ ...(await importOriginal<typeof import("@beyo/ui")>()), useSurfaceStore: { getState: () => ({ stack: mocks.stack }) } }));
vi.mock("@beyo/lib", async (importOriginal) => ({ ...(await importOriginal<typeof import("@beyo/lib")>()), notify }));
vi.mock("../api/use-stock-report-queries", () => ({ useStockReportVersionQuery: mocks.version }));
vi.mock("../controllers/use-stock-report-board-controller", () => ({
  useStockReportBoardController: (options: unknown) => {
    mocks.controllerOptions(options);
    return {
      permissions: { canPrioritise: true, canManageVersions: mocks.canManageVersions },
      bucket: "high",
      buckets: ["unset", "high", "medium", "low"],
      cards: [],
      status: "ready",
      activeFilterCount: 0,
      hasMore: false,
      isLoadingMore: false,
      isReorganiseMode: false,
      reorderDisabled: false,
      searchValue: "",
    };
  },
}));
// The board itself is covered by its own tests; here only the header slot matters.
vi.mock("../components/board/StockReportBoardView", () => ({
  StockReportBoardView: ({ header }: { header: React.ReactNode }) => <div>{header}</div>,
}));

import { stockReportMutationKeys } from "../api/stock-report-keys";
import { wireDraftStockReportSnapshotVersion, wireStockReportSnapshotVersion } from "../fixtures/stock-report-wire-fixtures";
import { StockReportDraftBoardSlidePage } from "./StockReportDraftBoardSlidePage";

const ready = (data: unknown) => ({ data, isError: false, error: null });
const notFound = () => ({ data: undefined, isError: true, error: Object.assign(new Error("not found"), { status: 404 }) });

function renderPage(queryClient = new QueryClient()) {
  render(
    <QueryClientProvider client={queryClient}>
      <StockReportDraftBoardSlidePage />
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("StockReportDraftBoardSlidePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canManageVersions = true;
    mocks.stack = [{ id: "stock-report-drafts-slide" }, { id: "stock-report-draft-board-slide" }];
  });
  afterEach(cleanup);

  it("scopes the board to the draft and titles it by the draft's own title", () => {
    mocks.version.mockReturnValue(ready(wireDraftStockReportSnapshotVersion({ title: "Autumn run" })));
    renderPage();

    expect(mocks.controllerOptions).toHaveBeenCalledWith({ versionId: "srv-draft" });
    expect(mocks.setTitle).toHaveBeenCalledWith("Autumn run");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Autumn run");
    expect(screen.getByTestId("stock-report-draft-board-page")).toBeInTheDocument();
    expect(mocks.closeMany).not.toHaveBeenCalled();
  });

  it("offers the version's ⋮ to the roles that manage versions, and to nobody else", () => {
    mocks.version.mockReturnValue(ready(wireDraftStockReportSnapshotVersion()));
    renderPage();
    fireEvent.click(screen.getByTestId("stock-report-draft-board-menu"));
    expect(mocks.open).toHaveBeenCalledWith("stock-report-version-actions-sheet", { versionId: "srv-draft" });

    cleanup();
    mocks.canManageVersions = false;
    renderPage();
    expect(screen.queryByTestId("stock-report-draft-board-menu")).not.toBeInTheDocument();
  });

  /** Projection R12: the pages stacked above the draft board are scoped to the same version, so they go too. */
  it("closes itself and every surface above it when the draft went live elsewhere, and says so", () => {
    mocks.stack = [{ id: "stock-report-drafts-slide" }, { id: "stock-report-draft-board-slide" }, { id: "stock-report-detail-slide" }, { id: "stock-report-detail-menu-sheet" }];
    mocks.version.mockReturnValue(ready(wireStockReportSnapshotVersion({ client_id: "srv-draft", state: "active" })));
    renderPage();

    expect(mocks.closeMany).toHaveBeenCalledTimes(1);
    expect(mocks.closeMany).toHaveBeenCalledWith(["stock-report-draft-board-slide", "stock-report-detail-slide", "stock-report-detail-menu-sheet"]);
    expect(notify.info).toHaveBeenCalledWith("This draft is now live");
  });

  it("closes itself when the draft was deleted elsewhere", () => {
    mocks.version.mockReturnValue(notFound());
    renderPage();

    expect(mocks.closeMany).toHaveBeenCalledWith(["stock-report-draft-board-slide"]);
    expect(notify.info).toHaveBeenCalledWith("This draft was deleted");
  });

  /** Projection R11: the user's own command already toasted — the page only closes. */
  it("closes without a toast when the change is the user's own command", async () => {
    const queryClient = new QueryClient();
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationKey: stockReportMutationKeys.versionCommand("srv-draft"),
      mutationFn: async () => null,
    });
    await mutation.execute(undefined);
    mocks.version.mockReturnValue(notFound());
    renderPage(queryClient);

    expect(mocks.closeMany).toHaveBeenCalledWith(["stock-report-draft-board-slide"]);
    expect(notify.info).not.toHaveBeenCalled();
  });
});
