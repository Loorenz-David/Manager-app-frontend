import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hub = vi.hoisted(() => ({
  controller: {
    permissions: { canManageVersions: true },
    version: null,
    versionStatus: "ready",
    missingSummary: null,
    createPhase: "idle" as "idle" | "creating" | "failed",
    createErrorMessage: undefined as string | undefined,
    createVersion: vi.fn(),
    dismissCreateFailure: vi.fn(),
    openBoard: vi.fn(),
    openMissing: vi.fn(),
    openHistory: vi.fn(),
    refetch: vi.fn(),
  },
}));

vi.mock("../controllers/use-stock-report-hub-controller", () => ({
  useStockReportHubController: () => hub.controller,
}));

import { StockReportHub } from "./StockReportHub";

describe("StockReportHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hub.controller.createPhase = "idle";
    hub.controller.createErrorMessage = undefined;
  });

  afterEach(cleanup);

  it("opens the board slide from the version card", () => {
    render(<StockReportHub />);

    fireEvent.click(screen.getByTestId("stock-report-hub-open-board"));
    expect(hub.controller.openBoard).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("stock-version-create-overlay")).toBeNull();
  });

  it("creates a version behind the tap-again confirm and opens the board once the backend has answered", () => {
    render(<StockReportHub />);

    fireEvent.click(screen.getByTestId("stock-report-hub-create-version"));
    fireEvent.click(screen.getByTestId("stock-report-hub-create-version"));
    expect(hub.controller.createVersion).toHaveBeenCalledTimes(1);
    // The success callback is the board opener — navigation never lives in
    // the action itself.
    expect(hub.controller.createVersion).toHaveBeenCalledWith(hub.controller.openBoard);
  });

  it("blocks the tab with the overlay while creating and lets a failure be dismissed", () => {
    hub.controller.createPhase = "creating";
    render(<StockReportHub />);
    expect(screen.getByTestId("stock-version-create-overlay").getAttribute("data-phase")).toBe("creating");
    cleanup();

    hub.controller.createPhase = "failed";
    hub.controller.createErrorMessage = "Stock report is temporarily unavailable.";
    render(<StockReportHub />);
    expect(screen.getByTestId("stock-version-create-overlay")).toHaveTextContent("Stock report is temporarily unavailable.");
    fireEvent.click(screen.getByTestId("stock-version-create-overlay-back"));
    expect(hub.controller.dismissCreateFailure).toHaveBeenCalledTimes(1);
  });
});
