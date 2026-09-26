import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StockReportLegendSheetContent } from "./StockReportLegendSheetContent";

afterEach(cleanup);

describe("StockReportLegendSheetContent", () => {
  it("draws the bar above one row per colour, with the number each segment carries", () => {
    render(
      <StockReportLegendSheetContent
        quantities={{ requested: 10, fulfilled: 3, inProgress: 2, inQueue: 1, missing: 0, }}
      />,
    );

    expect(screen.getByTestId("stock-report-legend-bar")).toBeInTheDocument();
    expect(screen.getByTestId("stock-report-legend-bar-fulfilled")).toHaveTextContent("3");
    expect(screen.getByTestId("stock-report-legend-fulfilled-value")).toHaveTextContent("3");
    expect(screen.getByTestId("stock-report-legend-in-progress-value")).toHaveTextContent("2");
    expect(screen.getByTestId("stock-report-legend-in-queue-value")).toHaveTextContent("1");
    // Zero rows stay: the sheet explains the colours, it does not summarise.
    expect(screen.getByTestId("stock-report-legend-missing-value")).toHaveTextContent("0");
    // Remaining is the bar's own arithmetic: 10 − 3 − 2 − 1.
    expect(screen.getByTestId("stock-report-legend-remaining-value")).toHaveTextContent("4");
  });
});
