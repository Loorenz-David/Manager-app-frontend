import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StockReportScheduleSheetContent } from "./StockReportScheduleSheetContent";

afterEach(cleanup);

// Projection R18: local constructors only; this file also runs under
// America/Los_Angeles (`test:stock-report`).
const NOW = new Date(2026, 9, 1, 12, 0).getTime();

/**
 * The real `DayCalendar`, not a stub: it renders in UTC, so this is the test
 * that proves a tapped day is the day the schedule lands on, and that the
 * highlight and the "before today" bound sit on the right cells, on both
 * sides of UTC.
 */
describe("StockReportScheduleSheetContent — with the real calendar", () => {
  it("schedules the tapped day at 06:00 local once confirmed", () => {
    const onSelect = vi.fn();
    const { container, getByTestId } = render(
      <StockReportScheduleSheetContent current={null} now={NOW} onDone={vi.fn()} onSelect={onSelect} />,
    );

    fireEvent.click(container.querySelector('[data-day="2026-10-15"] button')!);
    // The real calendar highlights the tapped cell, not its neighbour.
    expect(container.querySelector("[data-selected]")?.getAttribute("data-day")).toBe("2026-10-15");
    fireEvent.click(getByTestId("stock-report-schedule-confirm"));
    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 15, 6, 0).toISOString());
  });

  it("highlights the stored schedule's local day and disables only the days before today", () => {
    const { container } = render(
      <StockReportScheduleSheetContent
        current={new Date(2026, 9, 15, 23, 30).toISOString()}
        now={NOW}
        onDone={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(container.querySelector("[data-selected]")?.getAttribute("data-day")).toBe("2026-10-15");
    expect(container.querySelector('[data-day="2026-09-30"]')).toHaveAttribute("data-disabled");
    expect(container.querySelector('[data-day="2026-10-01"]')).not.toHaveAttribute("data-disabled");
  });
});
