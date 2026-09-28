import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  version: vi.fn(),
  storeOpen: vi.fn(),
  requestClose: vi.fn(),
  remove: { mutate: vi.fn(), isPending: false },
}));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({ setTitle: vi.fn(), setActions: vi.fn(), requestClose: mocks.requestClose, setHeaderHidden: vi.fn() }),
  useSurfaceProps: () => ({ versionId: "srv-draft" }),
}));
vi.mock("@beyo/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/ui")>()),
  useSurfaceStore: { getState: () => ({ open: mocks.storeOpen }) },
}));
vi.mock("../api/use-stock-report-queries", () => ({ useStockReportVersionQuery: mocks.version }));
vi.mock("../actions/use-stock-report-actions", () => ({ useDeleteStockReportVersion: () => mocks.remove }));

import { wireDraftStockReportSnapshotVersion, wireStockReportSnapshotVersion } from "../fixtures/stock-report-wire-fixtures";
import { StockReportVersionActionsSheetPage } from "./StockReportVersionActionsSheetPage";

const ready = (data: unknown) => ({ data, isPending: false, isError: false, error: null });

/** Projection R19: the destination opens on top first; the menu dismisses beneath it. */
function expectOpenedThenDismissed(id: string, props: unknown): void {
  expect(mocks.storeOpen).toHaveBeenCalledWith(id, props);
  expect(mocks.storeOpen.mock.invocationCallOrder[0]).toBeLessThan(mocks.requestClose.mock.invocationCallOrder[0] ?? 0);
}

describe("StockReportVersionActionsSheetPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.remove.isPending = false;
  });
  afterEach(cleanup);

  it("shows three row placeholders while the version loads", () => {
    mocks.version.mockReturnValue({ data: undefined, isPending: true, isError: false, error: null });
    render(<StockReportVersionActionsSheetPage />);
    expect(screen.getByTestId("stock-report-version-actions-skeleton").children).toHaveLength(3);
  });

  it("opens the form for Edit, then dismisses itself", () => {
    mocks.version.mockReturnValue(ready(wireDraftStockReportSnapshotVersion()));
    render(<StockReportVersionActionsSheetPage />);
    fireEvent.click(screen.getByTestId("stock-report-version-edit"));
    expectOpenedThenDismissed("stock-report-version-form-slide", { versionId: "srv-draft" });
  });

  it("opens the activation sheet for Activate now — it never activates in place", () => {
    mocks.version.mockReturnValue(ready(wireDraftStockReportSnapshotVersion()));
    render(<StockReportVersionActionsSheetPage />);
    fireEvent.click(screen.getByTestId("stock-report-version-activate"));
    expectOpenedThenDismissed("stock-report-activate-sheet", { mode: "activate", versionId: "srv-draft" });
  });

  it("opens the refresh confirmation for the live version's Refresh", () => {
    mocks.version.mockReturnValue(ready(wireStockReportSnapshotVersion({ client_id: "srv-draft" })));
    render(<StockReportVersionActionsSheetPage />);
    fireEvent.click(screen.getByTestId("stock-report-version-refresh"));
    expectOpenedThenDismissed("stock-report-refresh-sheet", { versionId: "srv-draft" });
  });

  it("deletes a draft on the second tap and closes only once it is gone", () => {
    mocks.version.mockReturnValue(ready(wireDraftStockReportSnapshotVersion()));
    render(<StockReportVersionActionsSheetPage />);
    fireEvent.click(screen.getByTestId("stock-report-version-delete"));
    fireEvent.click(screen.getByTestId("stock-report-version-delete"));

    expect(mocks.remove.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.requestClose).not.toHaveBeenCalled();
    const options = mocks.remove.mutate.mock.calls[0]?.[1] as { onSuccess: () => void };
    options.onSuccess();
    expect(mocks.requestClose).toHaveBeenCalled();
  });

  it("disables every row while the delete is in flight", () => {
    mocks.remove.isPending = true;
    mocks.version.mockReturnValue(ready(wireDraftStockReportSnapshotVersion()));
    render(<StockReportVersionActionsSheetPage />);
    expect(screen.getByTestId("stock-report-version-edit")).toBeDisabled();
    expect(screen.getByTestId("stock-report-version-activate")).toBeDisabled();
  });
});
