import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestClose: vi.fn(),
  refresh: { mutate: vi.fn(), isPending: false },
}));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({ setTitle: vi.fn(), setActions: vi.fn(), requestClose: mocks.requestClose, setHeaderHidden: vi.fn() }),
  useSurfaceProps: () => ({ versionId: "srv-1" }),
}));
vi.mock("../actions/use-stock-report-actions", () => ({ useRefreshStockReportVersionRequested: () => mocks.refresh }));

import { StockReportRefreshSheetPage } from "./StockReportRefreshSheetPage";

function settle(): void {
  const options = mocks.refresh.mutate.mock.calls.at(-1)?.[1] as { onSuccess: () => void };
  options.onSuccess();
}

describe("StockReportRefreshSheetPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refresh.isPending = false;
  });
  afterEach(cleanup);

  /** #22: the page cannot tell whether a row was typed by hand, so all three lines always show. */
  it("explains what a refresh does in three lines", () => {
    render(<StockReportRefreshSheetPage />);
    expect(screen.getByTestId("stock-report-refresh-note").querySelectorAll("p")).toHaveLength(3);
  });

  it("keeps typed values on one tap, and closes once the refresh is done", () => {
    render(<StockReportRefreshSheetPage />);
    fireEvent.click(screen.getByTestId("stock-report-refresh-keep"));
    expect(mocks.refresh.mutate).toHaveBeenCalledWith({ keepManualRequested: true }, expect.anything());
    expect(mocks.requestClose).not.toHaveBeenCalled();
    settle();
    expect(mocks.requestClose).toHaveBeenCalled();
  });

  it("replaces typed values only on the second tap", () => {
    render(<StockReportRefreshSheetPage />);
    fireEvent.click(screen.getByTestId("stock-report-refresh-replace"));
    expect(mocks.refresh.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("stock-report-refresh-replace"));
    expect(mocks.refresh.mutate).toHaveBeenCalledWith({ keepManualRequested: false }, expect.anything());
  });

  it("disables both choices while the refresh runs", () => {
    mocks.refresh.isPending = true;
    render(<StockReportRefreshSheetPage />);
    expect(screen.getByTestId("stock-report-refresh-keep")).toBeDisabled();
    expect(screen.getByTestId("stock-report-refresh-replace")).toBeDisabled();
  });
});
