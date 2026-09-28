import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const calendar = vi.hoisted(() => ({ props: null as null | { disabled: unknown; selected: unknown; onSelect: (date: Date | undefined) => void } }));

// The calendar is `react-day-picker`'s; the sheet's own rules are what is
// under test, so a stub hands it a picked day directly (the real calendar is
// exercised in `StockReportScheduleSheetCalendar.test.tsx`).
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

const confirm = () => screen.getByTestId("stock-report-schedule-confirm");
const clear = () => screen.getByTestId("stock-report-schedule-clear");

describe("StockReportScheduleSheetContent", () => {
  it("disables the days before today, and holds a picked day until Confirm, then emits it at 06:00 local and closes", () => {
    const { onSelect, onDone } = renderSheet();
    expect(calendar.props?.disabled).toEqual({ before: day(1) });
    expect(screen.getByTestId("stock-report-schedule-time")).toHaveValue("06:00");
    expect(confirm()).toBeDisabled();

    act(() => calendar.props?.onSelect(day(7)));
    // A tap only picks: nothing is sent and the sheet stays open.
    expect(onSelect).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(calendar.props?.selected).toEqual(day(7));

    fireEvent.click(confirm());
    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 7, 6, 0).toISOString());
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("starts from the stored schedule and confirms the changed time without a day tap", () => {
    const { onSelect, onDone } = renderSheet(new Date(2026, 9, 7, 9, 30).toISOString());
    expect(screen.getByTestId("stock-report-schedule-time")).toHaveValue("09:30");
    expect(calendar.props?.selected).toEqual(day(7));

    fireEvent.change(screen.getByTestId("stock-report-schedule-time"), { target: { value: "18:05" } });
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(confirm());
    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 7, 18, 5).toISOString());
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("refuses a pick in the past inline, keeps Confirm disabled, and recovers once the time is later", () => {
    const { onSelect } = renderSheet();
    // Today at 06:00 is already past at noon.
    act(() => calendar.props?.onSelect(day(1)));
    expect(screen.getByTestId("stock-report-schedule-error")).toHaveTextContent("Pick a time in the future.");
    expect(confirm()).toBeDisabled();
    fireEvent.click(confirm());
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId("stock-report-schedule-time"), { target: { value: "18:00" } });
    expect(screen.queryByTestId("stock-report-schedule-error")).not.toBeInTheDocument();
    fireEvent.click(confirm());
    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 1, 18, 0).toISOString());
  });

  it("clears the schedule and closes; with nothing stored or picked there is nothing to clear", () => {
    renderSheet();
    expect(clear()).toBeDisabled();
    cleanup();

    const { onSelect, onDone } = renderSheet(new Date(2026, 9, 7, 6, 0).toISOString());
    expect(clear()).toBeEnabled();
    fireEvent.click(clear());
    expect(onSelect).toHaveBeenCalledWith(null);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("lets a day picked in this opening be cleared again", () => {
    const { onSelect, onDone } = renderSheet();
    act(() => calendar.props?.onSelect(day(7)));
    expect(clear()).toBeEnabled();
    fireEvent.click(clear());
    expect(onSelect).toHaveBeenCalledWith(null);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
