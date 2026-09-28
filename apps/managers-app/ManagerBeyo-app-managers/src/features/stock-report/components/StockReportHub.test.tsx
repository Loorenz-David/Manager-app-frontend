import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hub = vi.hoisted(() => ({
  controller: {
    permissions: { canManageVersions: true },
    version: null,
    versionStatus: "ready",
    missingSummary: null,
    draftCount: 3 as number | undefined,
    openBoard: vi.fn(),
    openMissing: vi.fn(),
    openHistory: vi.fn(),
    openDrafts: vi.fn(),
    openCreateForm: vi.fn(),
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
  });

  afterEach(cleanup);

  it("opens the board slide from the version card", () => {
    render(<StockReportHub />);

    fireEvent.click(screen.getByTestId("stock-report-hub-open-board"));
    expect(hub.controller.openBoard).toHaveBeenCalledTimes(1);
  });

  /** OC-2: the hub no longer creates anything — it opens the form, and has no overlay. */
  it("opens the version form from New version, with no overlay of its own", () => {
    render(<StockReportHub />);

    fireEvent.click(screen.getByTestId("stock-report-hub-create-version"));
    expect(hub.controller.openCreateForm).toHaveBeenCalledTimes(1);
    expect(hub.controller.openBoard).not.toHaveBeenCalled();
    expect(screen.queryByTestId("stock-version-create-overlay")).toBeNull();
  });

  it("opens the drafts page, labelled with the controller's count", () => {
    render(<StockReportHub />);

    const drafts = screen.getByTestId("stock-report-hub-open-drafts");
    expect(drafts.textContent).toContain("Drafts · 3");
    fireEvent.click(drafts);
    expect(hub.controller.openDrafts).toHaveBeenCalledTimes(1);
  });
});
