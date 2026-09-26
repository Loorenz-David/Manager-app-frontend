import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LazyMotion, domAnimation } from "framer-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadBoard = vi.fn(() =>
  Promise.resolve({
    default: () => <div data-testid="stock-report-board" />,
  }),
);

vi.mock("@beyo/stock-report", () => ({
  loadStockReportRouteEntryPage: () => loadBoard(),
}));

// The board entry is created at module scope and caches its chunk, so each
// test imports a fresh copy to observe the preload from a cold start.
async function renderStack(): Promise<void> {
  vi.resetModules();
  const { StockReportManagerStack } = await import("./StockReportManagerStack");
  render(
    <LazyMotion features={domAnimation}>
      <StockReportManagerStack />
    </LazyMotion>,
  );
}

describe("StockReportManagerStack", () => {
  beforeEach(() => {
    loadBoard.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("opens on the hub with the board unmounted, preloading its chunk", async () => {
    await renderStack();

    expect(screen.getByTestId("stock-report-hub")).toBeTruthy();
    expect(screen.queryByTestId("stock-report-board")).toBeNull();
    expect(screen.queryByTestId("stock-report-board-back")).toBeNull();
    expect(loadBoard).toHaveBeenCalledTimes(1);
  });

  it("opens the board from the hub button", async () => {
    await renderStack();

    fireEvent.click(screen.getByTestId("stock-report-hub-open-board"));

    expect(await screen.findByTestId("stock-report-board")).toBeTruthy();
    expect(screen.getByTestId("stock-report-board-back")).toBeTruthy();
  });

  it("returns to the hub from the board's back row", async () => {
    await renderStack();

    fireEvent.click(screen.getByTestId("stock-report-hub-open-board"));
    fireEvent.click(await screen.findByTestId("stock-report-board-back"));

    expect(await screen.findByTestId("stock-report-hub")).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByTestId("stock-report-board")).toBeNull();
    });
  });
});
