import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permissions: vi.fn(),
}));

vi.mock("@beyo/hooks", () => ({
  useSurface: () => ({ close: vi.fn(), open: vi.fn() }),
  useSurfaceHeader: () => ({ setTitle: vi.fn() }),
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
  seesUnset: false,
  buckets: ["high", "medium", "low"],
  isWorker: true,
  defaultMajorCategory: "wood",
};

function renderPage(openTaskDetail?: (taskId: string) => void) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(stockReportKeys.list("high", { majorCategory: null }), [
    wireStockReportItem({ client_id: "sri-1", priority: "high" }),
  ]);
  return render(
    <QueryClientProvider client={queryClient}>
      <StockReportOpenersProvider openers={{ openTaskDetail }}>
        <StockReportDetailSlidePage />
      </StockReportOpenersProvider>
    </QueryClientProvider>,
  );
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
