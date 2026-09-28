import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permissions: vi.fn(),
  open: vi.fn(),
  setActions: vi.fn(),
  setMissing: { mutate: vi.fn(), isPending: false },
  useSetMissing: vi.fn(),
  props: { stockNeedId: "sri-1" } as { stockNeedId: string; versionId?: string },
}));

vi.mock("@beyo/hooks", () => ({
  useSurface: () => ({ close: vi.fn(), open: mocks.open }),
  usePreloadSurface: vi.fn(),
  useSurfaceHeader: () => ({ setTitle: vi.fn(), setActions: mocks.setActions }),
  useSurfaceProps: () => mocks.props,
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
  useSetStockReportMissingQuantity: (options: unknown) => {
    mocks.useSetMissing(options);
    return mocks.setMissing;
  },
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
// The view is a probe: the page's job is what it hands to `onTapCard` and
// which summary lines it threads through.
vi.mock("../components/detail/StockReportDetailView", () => ({
  StockReportDetailView: ({ onTapCard, isDraft, missingSource, requestedSource, requestedScanner, activeMissing }: { onTapCard?: (taskId: string) => void; isDraft?: boolean; missingSource?: string; requestedSource?: string; requestedScanner?: number; activeMissing?: number | null }) => (
    <button
      data-active-missing={String(activeMissing)}
      data-draft={String(isDraft)}
      data-enabled={onTapCard ? "true" : "false"}
      data-missing-source={missingSource}
      data-requested-scanner={String(requestedScanner)}
      data-requested-source={requestedSource}
      data-testid="probe-card"
      type="button"
      onClick={() => onTapCard?.("tsk_1")}
    />
  ),
}));

import { stockReportKeys } from "../api/stock-report-keys";
import { wireBorrowingDraftSnapshot, wireStockReportItem } from "../fixtures/stock-report-wire-fixtures";
import { StockReportOpenersProvider } from "../openers";
import type { StockReportDetailMenuSurfaceProps } from "../surface-ids";
import type { StockReportItem, StockReportItemSnapshot, StockReportListFilter } from "../stock-report.types";
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
const sellerPermissions = { ...workerPermissions, role: "seller", canPrioritise: true, canAssign: false, canMarkMissing: false, isWorker: false, defaultMajorCategory: null };
const managerPermissions = { ...sellerPermissions, role: "manager", canAssign: true, canMarkMissing: true, canManageVersions: true };
const BOARD = { majorCategory: null, missingOnly: false, versionId: null };
const DRAFT = { majorCategory: null, missingOnly: false, versionId: "srv-draft" };

// Lists are paged (`useInfiniteQuery`), so the seed is the shape the app
// writes — a flat array here once hid a page that never found its row.
function pagedList(items: StockReportItem[]) {
  return {
    pages: [{ items, hasMore: false, limit: 20, offset: 0 }],
    pageParams: [0],
  };
}

function draftRow(snapshot: Partial<StockReportItemSnapshot> = {}): StockReportItem {
  return wireStockReportItem({ client_id: "sri-1", snapshot: wireBorrowingDraftSnapshot({ client_id: "dsnap-sri-1", stock_report_item_id: "sri-1", ...snapshot }) });
}

function renderPage(openTaskDetail?: (taskId: string) => void, row = wireStockReportItem({ client_id: "sri-1" }), filter: StockReportListFilter = BOARD) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(stockReportKeys.list("high", filter), pagedList([row]));
  const view = render(
    <QueryClientProvider client={queryClient}>
      <StockReportOpenersProvider openers={{ openTaskDetail }}>
        <StockReportDetailSlidePage />
      </StockReportOpenersProvider>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

function headerButton() {
  const node = mocks.setActions.mock.calls.findLast((call) => call[0] !== null)?.[0];
  if (!node) throw new Error("no header action was registered");
  const { container } = render(node);
  return container.querySelector("button")!;
}

function lastMenuProps(): StockReportDetailMenuSurfaceProps {
  const call = mocks.open.mock.calls.findLast((entry) => entry[0] === "stock-report-detail-menu-sheet");
  if (!call) throw new Error("the menu was not opened");
  return call[1] as StockReportDetailMenuSurfaceProps;
}

describe("StockReportDetailSlidePage — task card tap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    mocks.permissions.mockReturnValue(workerPermissions);
    mocks.props = { stockNeedId: "sri-1" };
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
 * snapshot at tap time — and, since the draft-versions round, the requested
 * quantity for the roles that prioritise (OC-10).
 */
describe("StockReportDetailSlidePage — actions menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    mocks.props = { stockNeedId: "sri-1" };
  });

  afterEach(() => {
    cleanup();
  });

  it("registers the ⋮ for a worker and opens the menu with the snapshot's bounds", () => {
    mocks.permissions.mockReturnValue(workerPermissions);
    const row = wireStockReportItem({ client_id: "sri-1", quantity_requested: 10, quantity_in_queue: 2, quantity_in_progress: 1, quantity_awaiting: 3 });
    row.snapshot = { ...row.snapshot!, quantity_missing: 1 };
    renderPage(undefined, row);

    fireEvent.click(headerButton());

    // ceiling 10 − (2 + 1 + 3) = 4; one already missing leaves 3 to mark.
    expect(mocks.open).toHaveBeenCalledWith("stock-report-detail-menu-sheet", expect.objectContaining({ markable: 3, missing: 1, canMarkMissing: true }));
    const props = lastMenuProps();
    props.onMarkMissing();
    expect(mocks.setMissing.mutate).toHaveBeenCalledWith({ stockNeedId: "sri-1", quantityMissing: 4 });
    props.onUnmarkMissing();
    expect(mocks.setMissing.mutate).toHaveBeenCalledWith({ stockNeedId: "sri-1", quantityMissing: 0 });
    // A worker neither sets the requested quantity nor, on the board, follows anything.
    expect(props.onSetRequested).toBeUndefined();
    expect(props.onFollowLive).toBeUndefined();
    // The board's edits go through the shortcut routes.
    expect(mocks.useSetMissing).toHaveBeenCalledWith({ versionId: undefined });
  });

  it("seeds its own entry from the list and keeps following it after the row leaves every list", async () => {
    mocks.permissions.mockReturnValue(workerPermissions);
    const row = wireStockReportItem({ client_id: "sri-1", quantity_requested: 10 });
    row.snapshot = { ...row.snapshot!, quantity_missing: 4 };
    const { queryClient } = renderPage(undefined, row);

    await waitFor(() => expect(queryClient.getQueryData(stockReportKeys.item("sri-1", "active"))).toBeDefined());

    // The unmark path: the row is dropped from its list and the entry cleared.
    act(() => {
      queryClient.setQueryData(stockReportKeys.list("high", BOARD), pagedList([]));
      queryClient.setQueryData(stockReportKeys.item("sri-1", "active"), { ...row, snapshot: { ...row.snapshot!, quantity_missing: 0 } });
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

  /**
   * Projection R3: the ⋮ is for whoever has a row in it. A seller cannot mark
   * missing but sets the requested quantity (OC-10) — and, with no active
   * version cached (a seller's board never loads it), the sheet names the
   * version from the row's own snapshot (R4).
   */
  it("registers the ⋮ for a seller with the requested row alone, naming the version from the row", () => {
    mocks.permissions.mockReturnValue(sellerPermissions);
    const row = wireStockReportItem({ client_id: "sri-1", quantity_requested: 10 });
    row.snapshot = { ...row.snapshot!, version_id: "srv-live", quantity_requested: 12, quantity_requested_scanner: 10, quantity_requested_source: "manual" };
    renderPage(undefined, row);

    fireEvent.click(headerButton());
    const props = lastMenuProps();
    expect(props.canMarkMissing).toBe(false);
    expect(props.onFollowLive).toBeUndefined();
    props.onSetRequested?.();

    expect(mocks.open).toHaveBeenLastCalledWith("stock-report-requested-sheet", {
      stockNeedId: "sri-1",
      versionId: "srv-live",
      scope: "active",
      current: 12,
      source: "manual",
      scanner: 10,
    });
  });

  it("never registers the ⋮ for a role with nothing to do in it", () => {
    mocks.permissions.mockReturnValue({ ...sellerPermissions, canPrioritise: false });
    renderPage(undefined);

    expect(mocks.setActions.mock.calls.every((call) => call[0] === null)).toBe(true);
  });

  /**
   * Plan §C.2: opened from a draft board, the page reads the draft's scope —
   * its lists, its own entry, its versioned edits — and never the board's row
   * of the same stock need.
   */
  it("reads a draft's row from the draft's lists only, scopes its edits and offers the way back to the live count", async () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    mocks.props = { stockNeedId: "sri-1", versionId: "srv-draft" };
    const typed = draftRow({ quantity_missing: 4, quantity_missing_source: "own", active_quantity_missing: 2, quantity_requested: 9, quantity_requested_scanner: 7, quantity_requested_source: "manual" });
    const { queryClient } = renderPage(undefined, typed, DRAFT);
    // The board's row of the same stock need, which the page must not read.
    queryClient.setQueryData(stockReportKeys.list("high", BOARD), pagedList([wireStockReportItem({ client_id: "sri-1", quantity_requested: 5 })]));

    await waitFor(() => expect(queryClient.getQueryData(stockReportKeys.item("sri-1", "srv-draft"))).toBe(typed));
    expect(queryClient.getQueryData(stockReportKeys.item("sri-1", "active"))).toBeUndefined();
    expect(mocks.useSetMissing).toHaveBeenCalledWith({ versionId: "srv-draft" });

    const probe = screen.getByTestId("probe-card");
    expect(probe.getAttribute("data-draft")).toBe("true");
    expect(probe.getAttribute("data-missing-source")).toBe("own");
    expect(probe.getAttribute("data-active-missing")).toBe("2");
    expect(probe.getAttribute("data-requested-source")).toBe("manual");
    expect(probe.getAttribute("data-requested-scanner")).toBe("7");

    fireEvent.click(headerButton());
    const props = lastMenuProps();
    props.onFollowLive?.();
    expect(mocks.setMissing.mutate).toHaveBeenCalledWith({ stockNeedId: "sri-1", quantityMissing: null });
    props.onSetRequested?.();
    expect(mocks.open).toHaveBeenLastCalledWith("stock-report-requested-sheet", expect.objectContaining({ versionId: "srv-draft", scope: "srv-draft", current: 9, source: "manual", scanner: 7 }));
  });

  it("offers no way back on a draft row that already borrows the live count", () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    mocks.props = { stockNeedId: "sri-1", versionId: "srv-draft" };
    renderPage(undefined, draftRow(), DRAFT);

    fireEvent.click(headerButton());
    expect(lastMenuProps().onFollowLive).toBeUndefined();
  });

  it("waits rather than read the board's row when scoped to a draft that has no cached row", () => {
    mocks.permissions.mockReturnValue(managerPermissions);
    mocks.props = { stockNeedId: "sri-1", versionId: "srv-draft" };
    renderPage(undefined, wireStockReportItem({ client_id: "sri-1" }), BOARD);

    expect(screen.queryByTestId("probe-card")).toBeNull();
    expect(screen.getByText("Loading stock need…")).toBeDefined();
  });
});
