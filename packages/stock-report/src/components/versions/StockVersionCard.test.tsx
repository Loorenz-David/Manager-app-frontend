import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { wireStockReportSnapshotVersion, wireStockReportVersionProgress } from "../../fixtures/stock-report-wire-fixtures";
import { toStockReportVersionViewModel } from "../../stock-report.types";
import { StockVersionCard } from "./StockVersionCard";

afterEach(cleanup);

const NOW = new Date(2026, 8, 26, 12).getTime();

describe("StockVersionCard", () => {
  it("shows the active version's age, size and total progress with an Active pill", () => {
    const version = toStockReportVersionViewModel(wireStockReportSnapshotVersion({ client_id: "srv-1", active_at: new Date(2026, 8, 24, 9).toISOString() }), NOW);
    render(<StockVersionCard version={version} />);

    const card = screen.getByTestId("stock-version-card-srv-1");
    expect(card).toHaveTextContent("2 days running");
    // The filtered requested total (owner, 2026-09-26) — never the stored
    // `snapshot_count` (12) nor the filtered one (3).
    expect(card).toHaveTextContent("21 units requested");
    expect(card).toHaveTextContent("9 / 19 units");
    expect(card).toHaveTextContent("1 / 3 needs done");
    expect(card).toHaveTextContent("Active");
    expect(screen.getByTestId("stock-version-card-bar-srv-1")).toHaveAttribute("data-percent", "47");
  });

  it("draws work under way and queued before anything is completed", () => {
    // The hub bug of 2026-09-26: 0 of 5 done with one unit in progress drew
    // an empty track, so the version looked untouched.
    const started = wireStockReportVersionProgress({
      quantity_requested: 5,
      quantity_target: 5,
      quantity_in_progress: 1,
      quantity_in_queue: 2,
      quantity_awaiting: 0,
      quantity_completed: 0,
    });
    const version = toStockReportVersionViewModel(wireStockReportSnapshotVersion({ client_id: "srv-3", progress: started }), NOW);
    render(<StockVersionCard version={version} />);

    expect(screen.getByTestId("stock-version-card-srv-3")).toHaveTextContent("0 / 5 units");
    expect(screen.getByTestId("stock-version-card-bar-srv-3")).toHaveAttribute("data-percent", "0");
    expect(screen.queryByTestId("stock-version-card-bar-srv-3-fulfilled")).toBeNull();
    expect(screen.getByTestId("stock-version-card-bar-srv-3-in-progress")).toHaveAttribute("data-value", "1");
    expect(screen.getByTestId("stock-version-card-bar-srv-3-in-queue")).toHaveAttribute("data-value", "2");
  });

  it("says nothing was prioritised instead of drawing 0 %", () => {
    const empty = wireStockReportVersionProgress({ items_total: 0, quantity_requested: 0, quantity_target: 0, quantity_in_progress: 0, quantity_in_queue: 0, quantity_awaiting: 0, quantity_completed: 0 });
    const version = toStockReportVersionViewModel(wireStockReportSnapshotVersion({ client_id: "srv-2", closed_at: new Date(2026, 8, 25, 9).toISOString(), progress: empty }), NOW);
    render(<StockVersionCard version={version} />);

    expect(screen.getByTestId("stock-version-card-srv-2")).toHaveTextContent("Nothing prioritised yet");
    expect(screen.getByTestId("stock-version-card-srv-2")).not.toHaveTextContent("Active");
    expect(screen.getByTestId("stock-version-card-bar-srv-2")).toHaveAttribute("data-percent", "none");
  });
});
