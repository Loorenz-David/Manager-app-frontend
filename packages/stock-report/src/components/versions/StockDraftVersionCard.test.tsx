import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wireDraftStockReportSnapshotVersion } from "../../fixtures/stock-report-wire-fixtures";
import { toStockReportVersionViewModel } from "../../stock-report.types";
import { StockDraftVersionCard } from "./StockDraftVersionCard";

afterEach(cleanup);

const NOW = new Date(2026, 9, 1, 12, 0).getTime();

function renderCard(overrides: Parameters<typeof wireDraftStockReportSnapshotVersion>[0] = {}, canManage = true) {
  const onPress = vi.fn();
  const onMenu = vi.fn();
  const version = toStockReportVersionViewModel(wireDraftStockReportSnapshotVersion(overrides), NOW);
  render(<StockDraftVersionCard canManage={canManage} version={version} onMenu={onMenu} onPress={onPress} />);
  return { onPress, onMenu };
}

describe("StockDraftVersionCard", () => {
  it("titles an untitled draft by its creation day, and a titled one by its title", () => {
    renderCard({ title: null, created_at: new Date(2026, 8, 28, 9).toISOString() });
    expect(screen.getByTestId("stock-draft-card-title-srv-draft")).toHaveTextContent("Mon, 28th September");
    cleanup();
    renderCard({ title: "Autumn run" });
    expect(screen.getByTestId("stock-draft-card-title-srv-draft")).toHaveTextContent("Autumn run");
  });

  it("shows the schedule, marked overdue once it has passed without firing", () => {
    renderCard({ scheduled_activation_at: new Date(2026, 9, 7, 6, 0).toISOString() });
    expect(screen.getByTestId("stock-draft-card-schedule-srv-draft")).toHaveTextContent("Activates Wed, 7th Oct · 06:00");
    expect(screen.getByTestId("stock-draft-card-schedule-srv-draft")).not.toHaveTextContent("Overdue");
    cleanup();

    renderCard({ scheduled_activation_at: new Date(2026, 8, 30, 6, 0).toISOString() });
    expect(screen.getByTestId("stock-draft-card-schedule-srv-draft")).toHaveTextContent("Overdue");
    cleanup();

    renderCard({ scheduled_activation_at: null });
    expect(screen.queryByTestId("stock-draft-card-schedule-srv-draft")).not.toBeInTheDocument();
  });

  it("opens the board from the card and the actions from the ⋮, never both", () => {
    const { onPress, onMenu } = renderCard();
    fireEvent.click(screen.getByTestId("stock-draft-card-menu-srv-draft"));
    expect(onMenu).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("stock-draft-card-srv-draft"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onMenu).toHaveBeenCalledTimes(1);
  });

  it("shows the ⋮ only to the roles that manage versions, and per-card progress ids", () => {
    renderCard({}, false);
    expect(screen.queryByTestId("stock-draft-card-menu-srv-draft")).not.toBeInTheDocument();
    expect(screen.getByTestId("stock-draft-card-progress-srv-draft-by-priority")).toBeInTheDocument();
    expect(screen.getByTestId("stock-draft-card-progress-srv-draft-high")).toBeInTheDocument();
  });
});
