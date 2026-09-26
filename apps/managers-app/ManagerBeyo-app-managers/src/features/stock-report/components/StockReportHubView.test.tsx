import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  toStockReportVersionViewModel,
  type StockReportSnapshotVersion,
  type StockReportVersionProgressCounters,
} from "@beyo/stock-report";

import { StockReportHubView } from "./StockReportHubView";

afterEach(cleanup);

const NOW = new Date(2026, 8, 26, 12).getTime();

function counters(overrides: Partial<StockReportVersionProgressCounters> = {}): StockReportVersionProgressCounters {
  return {
    items_total: 0,
    items_completed: 0,
    quantity_requested: 0,
    quantity_missing: 0,
    quantity_target: 0,
    quantity_in_queue: 0,
    quantity_in_progress: 0,
    quantity_awaiting: 0,
    quantity_resolved: 0,
    quantity_completed: 0,
    ...overrides,
  };
}

const activeVersion: StockReportSnapshotVersion = {
  client_id: "srv-1",
  active_at: new Date(2026, 8, 24, 9).toISOString(),
  closed_at: null,
  snapshot_count: 12,
  filtered_snapshot_count: 3,
  created_at: new Date(2026, 8, 24, 9).toISOString(),
  created_by_id: "usr-1",
  closed_by_id: null,
  progress: {
    ...counters({ items_total: 3, items_completed: 1, quantity_requested: 19, quantity_target: 19, quantity_completed: 9 }),
    by_priority: {
      high: counters({ items_total: 2, quantity_target: 12, quantity_completed: 8 }),
      medium: counters({ items_total: 1, quantity_target: 7, quantity_completed: 1 }),
      low: counters(),
    },
  },
};

function renderHub(overrides: Partial<Parameters<typeof StockReportHubView>[0]> = {}) {
  const handlers = {
    onOpenBoard: vi.fn(),
    onOpenMissing: vi.fn(),
    onOpenHistory: vi.fn(),
    onCreateVersion: vi.fn(),
  };
  render(
    <StockReportHubView
      canManageVersions
      missingSummary={{ quantity_missing_total: 0, items_with_missing: 0 }}
      version={toStockReportVersionViewModel(activeVersion, NOW)}
      versionStatus="ready"
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

describe("StockReportHubView", () => {
  it("shows the active version's age and its progress per priority, and opens the board on tap", () => {
    const handlers = renderHub();

    // The size is the filtered requested total, not either snapshot count.
    expect(screen.getByTestId("stock-version-age")).toHaveTextContent("2 days running · 19 units requested");
    expect(screen.getByTestId("stock-version-progress-high-count")).toHaveTextContent("8/12");
    expect(screen.getByTestId("stock-version-progress-medium-count")).toHaveTextContent("1/7");
    // A group with nothing prioritised shows no fraction at all.
    expect(screen.getByTestId("stock-version-progress-low-count")).toHaveTextContent("—");
    expect(screen.getByTestId("stock-version-progress-high")).toHaveAttribute("data-percent", "67");

    fireEvent.click(screen.getByTestId("stock-report-hub-open-board"));
    expect(handlers.onOpenBoard).toHaveBeenCalledTimes(1);
  });

  it("hides the missing row at zero and shows it amber above the buttons otherwise", () => {
    renderHub();
    expect(screen.queryByTestId("stock-report-hub-open-missing")).not.toBeInTheDocument();
    cleanup();

    const handlers = renderHub({ missingSummary: { quantity_missing_total: 7, items_with_missing: 3 } });
    const row = screen.getByTestId("stock-report-hub-open-missing");
    expect(row).toHaveTextContent("7 missing");
    expect(row).toHaveTextContent("across 3 stock needs");
    // Owner layout: card, then the missing row, then the two buttons.
    const order = Array.from(screen.getByTestId("stock-report-hub").querySelectorAll("button[data-testid^='stock-report-hub-']")).map((node) => node.getAttribute("data-testid"));
    expect(order).toEqual([
      "stock-report-hub-open-board",
      "stock-report-hub-open-missing",
      "stock-report-hub-create-version",
      "stock-report-hub-open-history",
    ]);
    fireEvent.click(row);
    expect(handlers.onOpenMissing).toHaveBeenCalledTimes(1);
  });

  it("needs a second tap to create a version, and opens the history on one", () => {
    const handlers = renderHub();

    fireEvent.click(screen.getByTestId("stock-report-hub-create-version"));
    expect(handlers.onCreateVersion).not.toHaveBeenCalled();
    expect(screen.getByTestId("stock-report-hub-create-version")).toHaveTextContent("Confirm Tap");
    fireEvent.click(screen.getByTestId("stock-report-hub-create-version"));
    expect(handlers.onCreateVersion).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("stock-report-hub-open-history"));
    expect(handlers.onOpenHistory).toHaveBeenCalledTimes(1);
  });

  it("offers no New version to a role that cannot open one", () => {
    renderHub({ canManageVersions: false });
    expect(screen.queryByTestId("stock-report-hub-create-version")).not.toBeInTheDocument();
    expect(screen.getByTestId("stock-report-hub-open-history")).toBeInTheDocument();
  });

  it("explains the empty board before the first version and still opens it", () => {
    const handlers = renderHub({ version: null });

    expect(screen.getByTestId("stock-version-age")).toHaveTextContent("No version yet");
    expect(screen.queryByTestId("stock-version-progress-by-priority")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("stock-report-hub-open-board"));
    expect(handlers.onOpenBoard).toHaveBeenCalledTimes(1);
  });
});
