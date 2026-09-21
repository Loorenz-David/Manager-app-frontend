import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StockReportActionsSheetContent } from "./StockReportActionsSheetContent";
import { StockReportPrioritySheetContent } from "./StockReportPrioritySheetContent";

afterEach(cleanup);

describe("StockReportPrioritySheetContent", () => {
  it("offers the four choices and marks the current one", () => {
    render(
      <StockReportPrioritySheetContent current="medium" onSelect={vi.fn()} />,
    );

    for (const priority of ["unset", "high", "medium", "low"]) {
      expect(
        screen.getByTestId(`stock-report-priority-${priority}`),
      ).toBeInTheDocument();
    }

    expect(screen.getByTestId("stock-report-priority-medium")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("stock-report-priority-high")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports every choice, including the current one", async () => {
    const onSelect = vi.fn();
    render(
      <StockReportPrioritySheetContent current="medium" onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByTestId("stock-report-priority-high"));
    expect(onSelect).toHaveBeenLastCalledWith("high");

    // Deciding that the same value is not worth a request belongs to the
    // action hook, not to this sheet.
    await userEvent.click(screen.getByTestId("stock-report-priority-medium"));
    expect(onSelect).toHaveBeenLastCalledWith("medium");
  });
});

describe("StockReportActionsSheetContent", () => {
  it("offers removal alone, behind a confirm step", async () => {
    const onRemove = vi.fn();
    render(<StockReportActionsSheetContent onRemove={onRemove} />);

    const button = screen.getByTestId("stock-report-remove-assignment");
    expect(button).toHaveTextContent("Remove from stock need");

    await userEvent.click(button);

    expect(onRemove).not.toHaveBeenCalled();
    expect(button).toHaveTextContent("Tap again to remove");

    await userEvent.click(button);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
