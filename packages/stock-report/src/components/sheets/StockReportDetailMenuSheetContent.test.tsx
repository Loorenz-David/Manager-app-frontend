import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StockReportDetailMenuSheetContent } from "./StockReportDetailMenuSheetContent";

afterEach(cleanup);

describe("StockReportDetailMenuSheetContent", () => {
  it("offers both halves of the switch with their quantities, and reports the tap", () => {
    const onMarkMissing = vi.fn();
    const onUnmarkMissing = vi.fn();
    render(<StockReportDetailMenuSheetContent markable={3} missing={1} onMarkMissing={onMarkMissing} onUnmarkMissing={onUnmarkMissing} />);

    fireEvent.click(screen.getByTestId("stock-report-mark-missing"));
    fireEvent.click(screen.getByTestId("stock-report-unmark-missing"));

    expect(screen.getByTestId("stock-report-mark-missing")).toHaveTextContent("Mark 3 missing");
    expect(screen.getByTestId("stock-report-unmark-missing")).toHaveTextContent("Unmark 1 missing");
    expect(onMarkMissing).toHaveBeenCalledTimes(1);
    expect(onUnmarkMissing).toHaveBeenCalledTimes(1);
  });

  it("hides a half that has nothing to do", () => {
    render(<StockReportDetailMenuSheetContent markable={0} missing={4} onMarkMissing={vi.fn()} onUnmarkMissing={vi.fn()} />);
    expect(screen.queryByTestId("stock-report-mark-missing")).not.toBeInTheDocument();
    expect(screen.getByTestId("stock-report-unmark-missing")).toBeInTheDocument();
  });

  it("explains itself when every unit is already covered", () => {
    render(<StockReportDetailMenuSheetContent markable={0} missing={0} onMarkMissing={vi.fn()} onUnmarkMissing={vi.fn()} />);
    expect(screen.getByTestId("stock-report-detail-menu-empty")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
