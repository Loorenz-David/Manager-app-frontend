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
    expect(card).toHaveTextContent("12 stock needs");
    expect(card).toHaveTextContent("9 / 19 units");
    expect(card).toHaveTextContent("1 / 3 needs done");
    expect(card).toHaveTextContent("Active");
    expect(screen.getByTestId("stock-version-card-bar-srv-1")).toHaveAttribute("data-percent", "47");
  });

  it("says nothing was prioritised instead of drawing 0 %", () => {
    const empty = wireStockReportVersionProgress({ quantity_target: 0, quantity_completed: 0 });
    const version = toStockReportVersionViewModel(wireStockReportSnapshotVersion({ client_id: "srv-2", closed_at: new Date(2026, 8, 25, 9).toISOString(), progress: empty }), NOW);
    render(<StockVersionCard version={version} />);

    expect(screen.getByTestId("stock-version-card-srv-2")).toHaveTextContent("Nothing prioritised yet");
    expect(screen.getByTestId("stock-version-card-srv-2")).not.toHaveTextContent("Active");
    expect(screen.getByTestId("stock-version-card-bar-srv-2")).toHaveAttribute("data-percent", "none");
  });
});
