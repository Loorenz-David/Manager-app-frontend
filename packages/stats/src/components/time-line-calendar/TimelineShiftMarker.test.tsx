import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TimelineShiftMarker } from "./TimelineShiftMarker";
import {
  DEFAULT_PX_PER_HOUR,
  pxPerMinuteOf,
} from "../../lib/time-line-calendar/geometry";
import type { CalendarTimelineEvent } from "../../lib/time-line-calendar/segment-adapter";

const PPM = pxPerMinuteOf(DEFAULT_PX_PER_HOUR);

function marker(
  overrides: Partial<CalendarTimelineEvent> = {},
): CalendarTimelineEvent {
  return {
    key: "started_shift|2026-07-15T07:32:00Z",
    dateKey: "2026-07-15",
    state: "started_shift",
    stateLabel: "Shift started",
    startMinute: 7 * 60 + 32,
    endMinute: 7 * 60 + 32,
    startLabel: "07:32",
    endLabel: "07:32",
    durationLabel: "",
    isOpen: false,
    reasonLabel: null,
    primaryLabel: null,
    workingSectionName: null,
    recordCount: 0,
    records: [],
    completions: [],
    singleTaskId: null,
    isTaskActionable: false,
    isMarker: true,
    manuallyRecorded: false,
    laneIndex: 0,
    laneCount: 1,
    ...overrides,
  };
}

describe("TimelineShiftMarker", () => {
  afterEach(cleanup);

  it("renders a shift-start tick with its own testid", () => {
    render(<TimelineShiftMarker density="day" pxPerMinute={PPM} event={marker()} />);

    const el = screen.getByTestId(
      "timeline-shift-start-started_shift|2026-07-15T07:32:00Z",
    );
    expect(el).toHaveTextContent("Shift started 07:32");
  });

  it("renders a shift-end tick with its own testid", () => {
    render(
      <TimelineShiftMarker
        density="day" pxPerMinute={PPM}
        event={marker({
          key: "ended_shift|2026-07-15T13:35:00Z",
          state: "ended_shift",
          stateLabel: "Shift ended",
          startLabel: "13:35",
          endLabel: "13:35",
        })}
      />,
    );

    const el = screen.getByTestId(
      "timeline-shift-end-ended_shift|2026-07-15T13:35:00Z",
    );
    expect(el).toHaveTextContent("Shift ended 13:35");
  });

  it("keeps the full label but drops the connecting rule when compact", () => {
    render(<TimelineShiftMarker density="threeDay" pxPerMinute={PPM} event={marker()} />);

    const el = screen.getByTestId(
      "timeline-shift-start-started_shift|2026-07-15T07:32:00Z",
    );
    // Full label preserved (wraps in-column rather than spilling).
    expect(el).toHaveTextContent("Shift started 07:32");
    const label = el.querySelector(".flex-1.break-words");
    expect(label).not.toBeNull();
  });

  it("is non-interactive (no button)", () => {
    render(<TimelineShiftMarker density="day" pxPerMinute={PPM} event={marker()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
