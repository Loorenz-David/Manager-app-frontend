import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StockReportRequestedSource } from "../../stock-report.types";
import { StockReportRequestedSheetContent } from "./StockReportRequestedSheetContent";

afterEach(cleanup);

function renderSheet(source: StockReportRequestedSource, current = 5, scanner = 5) {
  const onSave = vi.fn();
  const onBackToLive = vi.fn();
  render(<StockReportRequestedSheetContent current={current} scanner={scanner} source={source} onBackToLive={onBackToLive} onSave={onSave} />);
  return { onSave, onBackToLive, input: screen.getByTestId("stock-report-requested-input") };
}

describe("StockReportRequestedSheetContent", () => {
  it("names where the number comes from", () => {
    renderSheet("scanner", 5, 5);
    expect(screen.getByTestId("stock-report-requested-source")).toHaveTextContent("from Scanner: 5");
    cleanup();
    renderSheet("manual", 8, 5);
    expect(screen.getByTestId("stock-report-requested-source")).toHaveTextContent("typed by hand");
  });

  /** v9 §5.22: on a Scanner row, saving the shown number pins it. */
  it("lets a Scanner row save its shown number, and keeps Back to live off there", () => {
    const { onSave, onBackToLive } = renderSheet("scanner", 5, 5);
    expect(screen.getByTestId("stock-report-requested-back-to-live")).toBeDisabled();
    fireEvent.click(screen.getByTestId("stock-report-requested-save"));
    expect(onSave).toHaveBeenCalledWith(5);
    expect(onBackToLive).not.toHaveBeenCalled();
  });

  it("keeps Save off on a typed row until the value changes, and sends Back to live as its own call", () => {
    const { onSave, onBackToLive, input } = renderSheet("manual", 8, 5);
    expect(screen.getByTestId("stock-report-requested-save")).toBeDisabled();

    fireEvent.change(input, { target: { value: "12" } });
    expect(screen.getByTestId("stock-report-requested-save")).toBeEnabled();
    fireEvent.click(screen.getByTestId("stock-report-requested-save"));
    expect(onSave).toHaveBeenCalledWith(12);

    fireEvent.click(screen.getByTestId("stock-report-requested-back-to-live"));
    expect(onBackToLive).toHaveBeenCalledTimes(1);
  });

  it("refuses an empty value", () => {
    const { onSave, input } = renderSheet("scanner", 5, 5);
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByTestId("stock-report-requested-save")).toBeDisabled();
    fireEvent.click(screen.getByTestId("stock-report-requested-save"));
    expect(onSave).not.toHaveBeenCalled();
  });
});
