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
  state: "active",
  title: null,
  active_at: new Date(2026, 8, 24, 9).toISOString(),
  closed_at: null,
  scheduled_activation_at: null,
  scheduled_activation_keeps_active_missing: false,
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
    onOpenDrafts: vi.fn(),
    onOpenHistory: vi.fn(),
    onCreateVersion: vi.fn(),
  };
  render(
    <StockReportHubView
      canManageVersions
      draftCount={2}
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
    // Owner layout: card, then the missing row, then [Drafts] [History], then New version.
    const order = Array.from(screen.getByTestId("stock-report-hub").querySelectorAll("button[data-testid^='stock-report-hub-']")).map((node) => node.getAttribute("data-testid"));
    expect(order).toEqual([
      "stock-report-hub-open-board",
      "stock-report-hub-open-missing",
      "stock-report-hub-open-drafts",
      "stock-report-hub-open-history",
      "stock-report-hub-create-version",
    ]);
    fireEvent.click(row);
    expect(handlers.onOpenMissing).toHaveBeenCalledTimes(1);
  });

  /** OC-2: the form asks before anything that closes the live version, so the hub does not. */
  it("opens the form on one tap of New version, and the drafts and the history on one tap each", () => {
    const handlers = renderHub();

    expect(screen.getByTestId("stock-report-hub-open-drafts")).toHaveTextContent("Drafts · 2");
    fireEvent.click(screen.getByTestId("stock-report-hub-create-version"));
    expect(handlers.onCreateVersion).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("stock-report-hub-create-version")).toHaveTextContent("New version");
    fireEvent.click(screen.getByTestId("stock-report-hub-open-drafts"));
    expect(handlers.onOpenDrafts).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("stock-report-hub-open-history"));
    expect(handlers.onOpenHistory).toHaveBeenCalledTimes(1);
  });

  /** Ledger #20: no dot at 0, none before the count has loaded. */
  it("reads plain Drafts while loading, on error and at zero", () => {
    for (const [draftCount, label] of [[undefined, "Drafts"], [0, "Drafts"], [1, "Drafts · 1"]] as const) {
      renderHub({ draftCount });
      expect(screen.getByTestId("stock-report-hub-open-drafts").textContent).toBe(label);
      cleanup();
    }
  });

  it("offers neither drafts nor New version to a role that cannot manage versions", () => {
    renderHub({ canManageVersions: false });
    expect(screen.queryByTestId("stock-report-hub-create-version")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stock-report-hub-open-drafts")).not.toBeInTheDocument();
    expect(screen.getByTestId("stock-report-hub-open-history")).toBeInTheDocument();
  });

  /** OC-18: the heading is the version's title, else its creation day. */
  it("heads the card with the version's title, falling back to its creation day", () => {
    renderHub({ version: toStockReportVersionViewModel({ ...activeVersion, title: "Autumn restock" }, NOW) });
    expect(screen.getByTestId("stock-version-title")).toHaveTextContent("Autumn restock");
    cleanup();

    renderHub();
    expect(screen.getByTestId("stock-version-title")).toHaveTextContent("Thu, 24th September");
    expect(screen.getByTestId("stock-version-title")).not.toHaveTextContent("Current version");
  });

  it("explains the empty board before the first version and still opens it", () => {
    const handlers = renderHub({ version: null });

    expect(screen.getByTestId("stock-version-age")).toHaveTextContent("No version yet");
    expect(screen.queryByTestId("stock-version-progress-by-priority")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("stock-report-hub-open-board"));
    expect(handlers.onOpenBoard).toHaveBeenCalledTimes(1);
  });
});
