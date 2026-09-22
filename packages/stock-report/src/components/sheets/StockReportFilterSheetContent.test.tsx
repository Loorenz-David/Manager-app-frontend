import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StockReportFilterSheetContent } from "./StockReportFilterSheetContent";

afterEach(cleanup);

function renderSheet(value: "wood" | "seat" | null) {
  const props = {
    value,
    onChange: vi.fn(),
    onClear: vi.fn(),
    onApply: vi.fn(),
  };
  render(<StockReportFilterSheetContent {...props} />);
  return props;
}

describe("StockReportFilterSheetContent", () => {
  it("offers the two major categories through the shared picker and marks the draft", () => {
    renderSheet("seat");

    expect(screen.getByTestId("stock-report-filter-major-wood")).toBeInTheDocument();
    expect(screen.getByTestId("stock-report-filter-major-seat")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("stock-report-filter-major-wood")).toHaveAttribute("aria-pressed", "false");
  });

  it("reports every tap, the selected category included, and leaves the toggle to the page", async () => {
    const props = renderSheet("wood");

    await userEvent.click(screen.getByTestId("stock-report-filter-major-wood"));
    await userEvent.click(screen.getByTestId("stock-report-filter-major-seat"));

    expect(props.onChange.mock.calls).toEqual([["wood"], ["seat"]]);
  });

  it("has Clear and Apply that fire their own callbacks and nothing else", async () => {
    const props = renderSheet(null);

    await userEvent.click(screen.getByTestId("stock-report-filter-clear"));
    expect(props.onClear).toHaveBeenCalledTimes(1);
    expect(props.onApply).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("stock-report-filter-apply"));
    expect(props.onApply).toHaveBeenCalledTimes(1);
    expect(props.onChange).not.toHaveBeenCalled();
  });
});
