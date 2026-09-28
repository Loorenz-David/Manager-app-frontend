import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StockReportVersionState } from "../../stock-report.types";
import { StockReportVersionActionsSheetContent } from "./StockReportVersionActionsSheetContent";

afterEach(cleanup);

const ROWS = ["stock-report-version-edit", "stock-report-version-refresh", "stock-report-version-activate", "stock-report-version-delete"];

function renderSheet(state: StockReportVersionState, disabled = false) {
  const handlers = { onEdit: vi.fn(), onRefresh: vi.fn(), onActivate: vi.fn(), onDelete: vi.fn() };
  render(<StockReportVersionActionsSheetContent disabled={disabled} state={state} {...handlers} />);
  const shown = ROWS.filter((id) => screen.queryByTestId(id) !== null);
  return { handlers, shown };
}

describe("StockReportVersionActionsSheetContent", () => {
  it("offers a draft edit, activate and delete, in that order — never refresh", () => {
    const { shown } = renderSheet("draft");
    expect(shown).toEqual(["stock-report-version-edit", "stock-report-version-activate", "stock-report-version-delete"]);
    const order = Array.from(screen.getByTestId("stock-report-version-actions").children).map((node) => node.getAttribute("data-testid"));
    expect(order.at(-1)).toBe("stock-report-version-delete");
  });

  /** v8 §5.18: refresh is the live version's alone. */
  it("offers the live version edit and refresh only", () => {
    expect(renderSheet("active").shown).toEqual(["stock-report-version-edit", "stock-report-version-refresh"]);
  });

  it("offers a closed version nothing", () => {
    expect(renderSheet("closed").shown).toEqual([]);
  });

  it("deletes only on the second tap", () => {
    const { handlers } = renderSheet("draft");
    fireEvent.click(screen.getByTestId("stock-report-version-delete"));
    expect(handlers.onDelete).not.toHaveBeenCalled();
    expect(screen.getByTestId("stock-report-version-delete")).toHaveTextContent("Tap again to delete");
    fireEvent.click(screen.getByTestId("stock-report-version-delete"));
    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
  });

  it("calls the row's handler, and disables every row while a request runs", () => {
    const { handlers } = renderSheet("active");
    fireEvent.click(screen.getByTestId("stock-report-version-edit"));
    fireEvent.click(screen.getByTestId("stock-report-version-refresh"));
    expect(handlers.onEdit).toHaveBeenCalledTimes(1);
    expect(handlers.onRefresh).toHaveBeenCalledTimes(1);
    cleanup();

    renderSheet("draft", true);
    for (const id of ["stock-report-version-edit", "stock-report-version-activate", "stock-report-version-delete"]) {
      expect(screen.getByTestId(id)).toBeDisabled();
    }
  });
});
