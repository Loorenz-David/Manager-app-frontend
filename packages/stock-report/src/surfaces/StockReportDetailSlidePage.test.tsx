import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permissions: vi.fn(),
  open: vi.fn(),
  setActions: vi.fn(),
  setMissing: { mutate: vi.fn(), isPending: false },
}));

vi.mock("@beyo/hooks", () => ({
  useSurface: () => ({ close: vi.fn(), open: mocks.open }),
  usePreloadSurface: vi.fn(),
  useSurfaceHeader: () => ({ setTitle: vi.fn(), setActions: mocks.setActions }),
  useSurfaceProps: () => ({ stockNeedId: "sri-1" }),
}));
vi.mock("../api/use-stock-report-queries", () => ({
  useStockReportAssignmentsQuery: () => ({
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock("../actions/use-stock-report-actions", () => ({
  useCreateStockAssignment: () => ({ mutateAsync: vi.fn() }),
  useRemoveStockAssignment: () => ({ mutate: vi.fn(), isPending: false }),
  useSetStockReportMissingQuantity: () => mocks.setMissing,
}));
vi.mock("../hooks/use-stock-assignment-gate", () => ({
  useStockAssignmentGate: () => ({
    check: vi.fn(),
    preload: vi.fn(),
    clear: vi.fn(),
    isPending: false,
    statusSlot: null,
    getAcceptedOverride: () => false,
    requestOverride: vi.fn(),
  }),
}));
vi.mock("../lib/use-stock-report-permissions", () => ({
  useStockReportPermissions: mocks.permissions,
}));
// The view is a probe: the page's job is what it hands to `onTapCard`.
vi.mock("../components/detail/StockReportDetailView", () => ({
  StockReportDetailView: ({ onTapCard }: { onTapCard?: (taskId: string) => void }) => (
    <button
      data-enabled={onTapCard ? "true" : "false"}
      data-testid="probe-card"
      type="button"
      onClick={() => onTapCard?.("tsk_1")}
    />
  ),
}));

import { stockReportKeys } from "../api/stock-report-keys";
import { wireStockReportItem } from "../fixtures/stock-report-wire-fixtures";
import { StockReportOpenersProvider } from "../openers";
import { StockReportDetailSlidePage } from "./StockReportDetailSlidePage";

const workerPermissions = {
  role: "worker",
  workspaceSpecialization: "wood_worker",
  canPrioritise: false,
  canAssign: true,
  canMarkMissing: true,
  canManageVersions: false,
  seesUnset: false,
  buckets: ["high", "medium", "low"],
  isWorker: true,
  defaultMajorCategory: "wood",
};
const sellerPermissions = { ...workerPermissions, role: "seller", canAssign: false, canMarkMissing: false, isWorker: false, defaultMajorCategory: null };
const BOARD = { majorCategory: null, missingOnly: false };

// Lists are paged (`useInfiniteQuery`), so the seed is the shape the app
// writes — a flat array here once hid a page that never found its row.
function pagedList(items: ReturnType<typeof wireStockReportItem>[]) {
  return {
    pages: [{ items, hasMore: false, limit: 20, offset: 0 }],
    pageParams: [0],
  };
}

function renderPage(openTaskDetail?: (taskId: string) => void, row = wireStockReportItem({ client_id: "sri-1" })) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(stockReportKeys.list("high", BOARD), pagedList([row]));
  const view = render(
    <QueryClientProvider client={queryClient}>
      <StockReportOpenersProvider openers={{ openTaskDetail }}>
        <StockReportDetailSlidePage />
      </StockReportOpenersProvider>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

describe("StockReportDetailSlidePage — task card tap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    mocks.permissions.mockReturnValue(workerPermissions);
  });

  afterEach(() => {
    cleanup();
  });

  // B8 executed (owner, 2026-09-22): a worker's tap opens the shared task
  // detail whenever the app supplies the opener — the role no longer gates it.
  it("opens the task detail for a worker when the app supplies the opener", () => {
    const openTaskDetail = vi.fn();
    renderPage(openTaskDetail);

    fireEvent.click(screen.getByTestId("probe-card"));
    expect(openTaskDetail).toHaveBeenCalledWith("tsk_1");
  });

  it("leaves the card body inert when no opener is supplied", () => {
    renderPage(undefined);

    expect(screen.getByTestId("probe-card").getAttribute("data-enabled")).toBe("false");
  });
});

/**
 * The ⋮ in the slide header (owner, 2026-09-26): the mark / unmark missing
 * switch, offered to the roles the endpoint admits and computed from the
 * snapshot at tap time.
 */
describe("StockReportDetailSlidePage — missing-quantity menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  function headerButton() {
    const node = mocks.setActions.mock.calls.findLast((call) => call[0] !== null)?.[0];
    if (!node) throw new Error("no header action was registered");
    const { container } = render(node);
    return container.querySelector("button")!;
  }

  it("registers the ⋮ for a worker and opens the menu with the snapshot's bounds", () => {
    mocks.permissions.mockReturnValue(workerPermissions);
    const row = wireStockReportItem({ client_id: "sri-1", quantity_requested: 10, quantity_in_queue: 2, quantity_in_progress: 1, quantity_awaiting: 3 });
    row.snapshot = { ...row.snapshot!, quantity_missing: 1 };
    renderPage(undefined, row);

    fireEvent.click(headerButton());

    // ceiling 10 − (2 + 1 + 3) = 4; one already missing leaves 3 to mark.
    expect(mocks.open).toHaveBeenCalledWith("stock-report-detail-menu-sheet", expect.objectContaining({ markable: 3, missing: 1 }));
    const props = mocks.open.mock.calls[0]?.[1] as { onMarkMissing: () => void; onUnmarkMissing: () => void };
    props.onMarkMissing();
    expect(mocks.setMissing.mutate).toHaveBeenCalledWith({ stockNeedId: "sri-1", quantityMissing: 4 });
    props.onUnmarkMissing();
    expect(mocks.setMissing.mutate).toHaveBeenCalledWith({ stockNeedId: "sri-1", quantityMissing: 0 });
  });

  it("seeds its own entry from the list and keeps following it after the row leaves every list", async () => {
    mocks.permissions.mockReturnValue(workerPermissions);
    const row = wireStockReportItem({ client_id: "sri-1", quantity_requested: 10 });
    row.snapshot = { ...row.snapshot!, quantity_missing: 4 };
    const { queryClient } = renderPage(undefined, row);

    await waitFor(() => expect(queryClient.getQueryData(stockReportKeys.item("sri-1"))).toBeDefined());

    // The unmark path: the row is dropped from its list and the entry cleared.
    act(() => {
      queryClient.setQueryData(stockReportKeys.list("high", BOARD), pagedList([]));
      queryClient.setQueryData(stockReportKeys.item("sri-1"), { ...row, snapshot: { ...row.snapshot!, quantity_missing: 0 } });
    });

    // The query observer notifies on the next tick, so the page's re-render
    // (and the bounds the ⋮ reads through its ref) is awaited rather than
    // assumed. The button is rendered once, outside the wait: `waitFor`
    // re-runs on every DOM mutation, and rendering inside it would loop.
    const button = headerButton();
    await waitFor(() => {
      fireEvent.click(button);
      expect(mocks.open).toHaveBeenLastCalledWith("stock-report-detail-menu-sheet", expect.objectContaining({ markable: 10, missing: 0 }));
    });
  });

  it("never registers the ⋮ for a seller", () => {
    mocks.permissions.mockReturnValue(sellerPermissions);
    renderPage(undefined);

    expect(mocks.setActions.mock.calls.every((call) => call[0] === null)).toBe(true);
  });
});
