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
    createDraft: vi.fn(),
    isCreatingDraft: false,
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

  /** Owner, 2026-09-28: + New Draft creates directly; the form is Edit-only. */
  it("creates a draft from New Draft, with no overlay of its own", () => {
    render(<StockReportHub />);

    fireEvent.click(screen.getByTestId("stock-report-hub-create-version"));
    expect(hub.controller.createDraft).toHaveBeenCalledTimes(1);
    expect(hub.controller.openBoard).not.toHaveBeenCalled();
    expect(screen.queryByTestId("stock-version-create-overlay")).toBeNull();
  });

  it("opens the drafts page, labelled with the controller's count", () => {
    render(<StockReportHub />);

    const drafts = screen.getByTestId("stock-report-hub-open-drafts");
    expect(drafts.textContent).toContain("Drafts (3)");
    fireEvent.click(drafts);
    expect(hub.controller.openDrafts).toHaveBeenCalledTimes(1);
  });
});
