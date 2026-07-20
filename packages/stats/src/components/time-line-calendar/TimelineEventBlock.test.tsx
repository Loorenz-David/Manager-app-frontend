import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TimelineEventBlock } from "./TimelineEventBlock";
import {
  DEFAULT_PX_PER_HOUR,
  pxPerMinuteOf,
} from "../../lib/time-line-calendar/geometry";
import type { CalendarTimelineEvent } from "../../lib/time-line-calendar/segment-adapter";

// Line-budget assertions rely on the default scale (1.6 px/min).
const PPM = pxPerMinuteOf(DEFAULT_PX_PER_HOUR);

function makeEvent(
  overrides: Partial<CalendarTimelineEvent> = {},
): CalendarTimelineEvent {
  return {
    key: "working|2026-07-15T07:32:00Z|2026-07-15",
    dateKey: "2026-07-15",
    state: "working",
    stateLabel: "Working",
    startMinute: 7 * 60 + 32,
    endMinute: 9 * 60 + 15,
    startLabel: "07:32",
    endLabel: "09:15",
    durationLabel: "1h 43m",
    isOpen: false,
    reasonLabel: null,
    primaryLabel: "ART-100",
    workingSectionName: "Upholstery",
    recordCount: 1,
    records: [],
    completions: [],
    singleTaskId: "tsk_1",
    isTaskActionable: true,
    isMarker: false,
    manuallyRecorded: false,
    laneIndex: 0,
    laneCount: 1,
    ...overrides,
  };
}

describe("TimelineEventBlock", () => {
  afterEach(cleanup);

  it("renders a working event with time range, duration and item identity", () => {
    render(<TimelineEventBlock density="day" pxPerMinute={PPM} event={makeEvent()} />);

    const block = screen.getByTestId(
      "timeline-event-working|2026-07-15T07:32:00Z|2026-07-15",
    );
    expect(block).toHaveTextContent("Working");
    expect(block).toHaveTextContent("07:32 – 09:15 · 1h 43m");
    expect(block).toHaveTextContent("ART-100 · Upholstery");
  });

  it("drops lines from the bottom to fit a short block height", () => {
    // 30 min → ~48px → 2 lines: title + time, item dropped.
    const twoLine = makeEvent({ startMinute: 0, endMinute: 30 });
    const { unmount } = render(
      <TimelineEventBlock density="day" pxPerMinute={PPM} event={twoLine} />,
    );
    expect(screen.getByText("Working")).toBeInTheDocument();
    expect(screen.getByText(/07:32 – 09:15/)).toBeInTheDocument();
    expect(screen.queryByText(/ART-100/)).not.toBeInTheDocument();
    unmount();

    // 15 min → ~24px → 1 line: title only.
    const oneLine = makeEvent({ startMinute: 0, endMinute: 15 });
    render(<TimelineEventBlock density="day" pxPerMinute={PPM} event={oneLine} />);
    expect(screen.getByText("Working")).toBeInTheDocument();
    expect(screen.queryByText(/07:32 – 09:15/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ART-100/)).not.toBeInTheDocument();
  });

  it("renders no text when the block is too short for even one line", () => {
    const tiny = makeEvent({ startMinute: 0, endMinute: 8 });
    render(<TimelineEventBlock density="day" pxPerMinute={PPM} event={tiny} />);
    expect(screen.queryByText("Working")).not.toBeInTheDocument();
  });

  it("compacts content in threeDay density", () => {
    render(<TimelineEventBlock density="threeDay" pxPerMinute={PPM} event={makeEvent()} />);

    const block = screen.getByTestId(
      "timeline-event-working|2026-07-15T07:32:00Z|2026-07-15",
    );
    expect(block).toHaveTextContent("1h 43m");
    expect(block).not.toHaveTextContent("07:32 – 09:15");
  });

  it("labels paused events with the reason and duration", () => {
    render(
      <TimelineEventBlock
        density="day" pxPerMinute={PPM}
        event={makeEvent({
          state: "paused",
          stateLabel: "Paused",
          reasonLabel: "Waiting on materials",
        })}
      />,
    );

    const block = screen.getByTestId(
      "timeline-event-working|2026-07-15T07:32:00Z|2026-07-15",
    );
    expect(block).toHaveTextContent("Paused · Waiting on materials");
  });

  it("renders idle events without any interaction target", () => {
    render(
      <TimelineEventBlock
        density="day" pxPerMinute={PPM}
        event={makeEvent({
          state: "idle",
          stateLabel: "Idle",
          primaryLabel: null,
          isTaskActionable: false,
          singleTaskId: null,
        })}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/Idle · no activity detected/)).toBeInTheDocument();
  });

  it("exposes an accessible name and fires onSelect through the hit target", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const event = makeEvent({ recordCount: 2 });

    render(<TimelineEventBlock density="day" pxPerMinute={PPM} event={event} onSelect={onSelect} />);

    const hit = screen.getByRole("button");
    expect(hit).toHaveAccessibleName(
      "Working, ART-100, 07:32 to 09:15, 1h 43m, 2 records",
    );
    await user.click(hit);
    expect(onSelect).toHaveBeenCalledWith(event);
  });

  it("renders completion pills and groups overlapping markers", () => {
    render(
      <TimelineEventBlock
        density="day" pxPerMinute={PPM}
        event={makeEvent({
          completions: [
            {
              key: "completion|a",
              minute: 9 * 60 + 15,
              label: "ART-100",
              recordId: "a",
              taskId: "tsk_1",
            },
            {
              key: "completion|b",
              minute: 9 * 60 + 14,
              label: "ART-101",
              recordId: "b",
              taskId: "tsk_2",
            },
          ],
        })}
      />,
    );

    expect(screen.getByText(/2 completed/)).toBeInTheDocument();
  });

  it("marks open events as in progress in the accessible name", () => {
    render(
      <TimelineEventBlock
        density="day" pxPerMinute={PPM}
        event={makeEvent({ isOpen: true, endLabel: "now" })}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("button")).toHaveAccessibleName(
      /in progress/,
    );
  });
});
