import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestClose: vi.fn(),
  hookArgs: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({ setTitle: vi.fn(), setActions: vi.fn(), requestClose: mocks.requestClose, setHeaderHidden: vi.fn() }),
  useSurfaceProps: () => ({ stockNeedId: "sri-1", versionId: "srv-1", scope: "active", current: 8, source: "manual", scanner: 5 }),
}));
vi.mock("../actions/use-stock-report-actions", () => ({
  useSetStockReportRequestedQuantity: (args: unknown) => {
    mocks.hookArgs(args);
    return { mutate: mocks.mutate, isPending: false };
  },
}));

import { StockReportRequestedSheetPage } from "./StockReportRequestedSheetPage";

describe("StockReportRequestedSheetPage", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  /** Projection R4: the request names the row's own version; the cache is the scope the page read. */
  it("scopes the mutation to the version it was opened for", () => {
    render(<StockReportRequestedSheetPage />);
    expect(mocks.hookArgs).toHaveBeenCalledWith({ versionId: "srv-1", scope: "active" });
  });

  it("saves the typed value and closes at once — the edit is optimistic", () => {
    render(<StockReportRequestedSheetPage />);
    fireEvent.change(screen.getByTestId("stock-report-requested-input"), { target: { value: "11" } });
    fireEvent.click(screen.getByTestId("stock-report-requested-save"));
    expect(mocks.mutate).toHaveBeenCalledWith({ stockNeedId: "sri-1", value: 11 });
    expect(mocks.requestClose).toHaveBeenCalled();
  });

  it("sends null to go back to Scanner's value", () => {
    render(<StockReportRequestedSheetPage />);
    fireEvent.click(screen.getByTestId("stock-report-requested-back-to-live"));
    expect(mocks.mutate).toHaveBeenCalledWith({ stockNeedId: "sri-1", value: null });
    expect(mocks.requestClose).toHaveBeenCalled();
  });
});
