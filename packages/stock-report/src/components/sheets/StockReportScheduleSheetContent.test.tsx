import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const calendar = vi.hoisted(() => ({ props: null as null | { disabled: unknown; selected: unknown; onSelect: (date: Date | undefined) => void } }));

// The calendar is `react-day-picker`'s; the sheet's own rules are what is
// under test, so a stub hands it a picked day directly.
vi.mock("@beyo/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/ui")>()),
  DayCalendar: (props: { disabled: unknown; selected: unknown; onSelect: (date: Date | undefined) => void }) => {
    calendar.props = props;
    return <div data-testid="day-calendar" />;
  },
}));

import { StockReportScheduleSheetContent } from "./StockReportScheduleSheetContent";

afterEach(cleanup);

// Projection R18: local constructors for instants; calendar days are UTC
// midnights, as `DayCalendar` hands them over.
const NOW = new Date(2026, 9, 1, 12, 0).getTime();
const day = (date: number) => new Date(Date.UTC(2026, 9, date));

function renderSheet(current: string | null = null) {
  const onSelect = vi.fn();
  const onDone = vi.fn();
  render(<StockReportScheduleSheetContent current={current} now={NOW} onDone={onDone} onSelect={onSelect} />);
  return { onSelect, onDone };
}

describe("StockReportScheduleSheetContent", () => {
  it("offers Remove schedule only while there is one, and emits null", () => {
    renderSheet();
    expect(screen.queryByTestId("stock-report-schedule-remove")).not.toBeInTheDocument();
    cleanup();

    const { onSelect, onDone } = renderSheet(new Date(2026, 9, 7, 6, 0).toISOString());
    fireEvent.click(screen.getByTestId("stock-report-schedule-remove"));
    expect(onSelect).toHaveBeenCalledWith(null);
    expect(onDone).toHaveBeenCalled();
  });

  it("disables the days before today and emits a picked day at 06:00 local, then closes", () => {
    const { onSelect, onDone } = renderSheet();
    expect(calendar.props?.disabled).toEqual({ before: day(1) });
    expect(screen.getByTestId("stock-report-schedule-time")).toHaveValue("06:00");

    act(() => calendar.props?.onSelect(day(7)));
    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 7, 6, 0).toISOString());
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("composes the chosen time, and re-emits a time change once a day is chosen without closing", () => {
    const { onSelect, onDone } = renderSheet(new Date(2026, 9, 7, 9, 30).toISOString());
    expect(screen.getByTestId("stock-report-schedule-time")).toHaveValue("09:30");
    expect(calendar.props?.selected).toEqual(day(7));

    fireEvent.change(screen.getByTestId("stock-report-schedule-time"), { target: { value: "18:05" } });
    expect(onSelect).toHaveBeenLastCalledWith(new Date(2026, 9, 7, 18, 5).toISOString());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("refuses an instant in the past inline and emits nothing", () => {
    const { onSelect, onDone } = renderSheet();
    // Today at 06:00 is already past at noon.
    act(() => calendar.props?.onSelect(day(1)));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByTestId("stock-report-schedule-error")).toHaveTextContent("Pick a time in the future.");

    fireEvent.change(screen.getByTestId("stock-report-schedule-time"), { target: { value: "18:00" } });
    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 1, 18, 0).toISOString());
    expect(screen.queryByTestId("stock-report-schedule-error")).not.toBeInTheDocument();
  });
});
