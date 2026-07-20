import { describe, expect, it } from "vitest";

import { localDateKey } from "./local-date";
import {
  computeVisibleTotals,
  dayLastActivityMinute,
  toCalendarTimelineEvents,
  validateTimelineTotals,
} from "./segment-adapter";
import type {
  WorkerLinearTimeline,
  WorkerLinearTimelineSegment,
  WorkerLinearTimelineStepRecord,
} from "../../types";

// Build ISO strings from LOCAL wall-clock components so expectations hold in
// any host timezone (the adapter converts back to local for display).
function iso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

const DAY_KEY = localDateKey(new Date(2026, 6, 15));

function makeRecord(
  overrides: Partial<WorkerLinearTimelineStepRecord> = {},
): WorkerLinearTimelineStepRecord {
  return {
    record_id: "ssr_1",
    step_id: "tsp_1",
    task_id: "tsk_1",
    working_section_id: "wsec_1",
    working_section_name: "Upholstery",
    item: { client_id: "itm_1", article_number: "ART-100", sku: "SKU-100" },
    state: "working",
    reason: null,
    entered_at: iso(2026, 7, 15, 9, 30),
    exited_at: iso(2026, 7, 15, 10, 15),
    is_open: false,
    ended_by: "working",
    ...overrides,
  };
}

function makeSegment(
  overrides: Partial<WorkerLinearTimelineSegment> = {},
): WorkerLinearTimelineSegment {
  return {
    start: iso(2026, 7, 15, 9, 30),
    end: iso(2026, 7, 15, 10, 15),
    seconds: 2700,
    state: "working",
    reason: null,
    is_open: false,
    manually_recorded: false,
    steps: [makeRecord()],
    ...overrides,
  };
}

const NOW = new Date(2026, 6, 19, 12, 0);

describe("toCalendarTimelineEvents", () => {
  it("maps a working segment to a positioned, labelled event", () => {
    const [event] = toCalendarTimelineEvents([makeSegment()], { now: NOW });

    expect(event.dateKey).toBe(DAY_KEY);
    expect(event.state).toBe("working");
    expect(event.stateLabel).toBe("Working");
    expect(event.startMinute).toBe(9 * 60 + 30);
    expect(event.endMinute).toBe(10 * 60 + 15);
    expect(event.startLabel).toBe("09:30");
    expect(event.endLabel).toBe("10:15");
    expect(event.durationLabel).toBe("0h 45m");
    expect(event.primaryLabel).toBe("ART-100");
    expect(event.singleTaskId).toBe("tsk_1");
    expect(event.isTaskActionable).toBe(true);
    expect(event.isMarker).toBe(false);
    expect(event.manuallyRecorded).toBe(false);
    expect(event.laneIndex).toBe(0);
    expect(event.laneCount).toBe(1);
  });

  it("threads manually_recorded onto explicit shift pauses", () => {
    const [event] = toCalendarTimelineEvents(
      [
        makeSegment({
          state: "paused",
          reason: "pause_lunch_break",
          manually_recorded: true,
          steps: [makeRecord({ state: "paused", reason: "pause_lunch_break" })],
        }),
      ],
      { now: NOW },
    );

    expect(event.manuallyRecorded).toBe(true);
    expect(event.isMarker).toBe(false);
  });

  it("maps paused segments with known and unknown reasons", () => {
    const [known, unknown] = toCalendarTimelineEvents(
      [
        makeSegment({
          state: "paused",
          reason: "pause_lunch_break",
          steps: [makeRecord({ state: "paused", reason: "pause_lunch_break" })],
        }),
        makeSegment({
          start: iso(2026, 7, 15, 11, 0),
          end: iso(2026, 7, 15, 11, 30),
          state: "paused",
          reason: "waiting_for_material",
          steps: [
            makeRecord({ state: "paused", reason: "waiting_for_material" }),
          ],
        }),
      ],
      { now: NOW },
    );

    expect(known.reasonLabel).toBe("Lunch break");
    expect(unknown.reasonLabel).toBe("Waiting for material");
    expect(known.records[0].reasonLabel).toBe("Lunch break");
  });

  it("keeps idle events inert with empty records", () => {
    const [event] = toCalendarTimelineEvents(
      [makeSegment({ state: "idle", steps: [] })],
      { now: NOW },
    );

    expect(event.stateLabel).toBe("Idle");
    expect(event.records).toHaveLength(0);
    expect(event.isTaskActionable).toBe(false);
    expect(event.singleTaskId).toBeNull();
    expect(event.primaryLabel).toBeNull();
  });

  it("maps ended-shift segments as a non-actionable line marker", () => {
    const [event] = toCalendarTimelineEvents(
      [makeSegment({ state: "ended_shift", steps: [] })],
      { now: NOW },
    );

    expect(event.state).toBe("ended_shift");
    expect(event.stateLabel).toBe("Shift ended");
    expect(event.isMarker).toBe(true);
    expect(event.isTaskActionable).toBe(false);
  });

  it("maps zero-duration started/ended shift markers positioned at the tick", () => {
    const events = toCalendarTimelineEvents(
      [
        {
          start: iso(2026, 7, 15, 7, 32),
          end: iso(2026, 7, 15, 7, 32),
          seconds: 0,
          state: "started_shift",
          reason: null,
          is_open: false,
          manually_recorded: false,
          steps: [],
        },
        {
          start: iso(2026, 7, 15, 13, 35),
          end: iso(2026, 7, 15, 13, 35),
          seconds: 0,
          state: "ended_shift",
          reason: null,
          is_open: false,
          manually_recorded: false,
          steps: [],
        },
      ],
      { now: NOW },
    );

    expect(events).toHaveLength(2);
    const [start, end] = events;
    expect(start.state).toBe("started_shift");
    expect(start.stateLabel).toBe("Shift started");
    expect(start.isMarker).toBe(true);
    expect(start.startMinute).toBe(7 * 60 + 32);
    expect(start.startMinute).toBe(start.endMinute);
    expect(start.startLabel).toBe("07:32");
    expect(start.isTaskActionable).toBe(false);

    expect(end.state).toBe("ended_shift");
    expect(end.stateLabel).toBe("Shift ended");
    expect(end.isMarker).toBe(true);
    expect(end.startLabel).toBe("13:35");
  });

  it("falls back article → SKU → section for the primary label", () => {
    const skuOnly = toCalendarTimelineEvents(
      [
        makeSegment({
          steps: [
            makeRecord({
              item: { client_id: "itm_1", article_number: null, sku: "SKU-9" },
            }),
          ],
        }),
      ],
      { now: NOW },
    )[0];
    expect(skuOnly.primaryLabel).toBe("SKU-9");

    const sectionOnly = toCalendarTimelineEvents(
      [makeSegment({ steps: [makeRecord({ item: null })] })],
      { now: NOW },
    )[0];
    expect(sectionOnly.primaryLabel).toBe("Upholstery");

    const bare = toCalendarTimelineEvents(
      [
        makeSegment({
          steps: [makeRecord({ item: null, working_section_name: null })],
        }),
      ],
      { now: NOW },
    )[0];
    expect(bare.primaryLabel).toBeNull();
  });

  it("handles open records and unknown ended_by values", () => {
    const [event] = toCalendarTimelineEvents(
      [
        makeSegment({
          steps: [
            makeRecord({
              exited_at: null,
              is_open: true,
              ended_by: "some_future_value",
            }),
          ],
        }),
      ],
      { now: NOW },
    );

    expect(event.records[0].exitedAtLabel).toBeNull();
    expect(event.records[0].isOpen).toBe(true);
    expect(event.records[0].isCompleted).toBe(false);
  });

  it("extends an open segment to the client now and labels its end", () => {
    const [event] = toCalendarTimelineEvents(
      [
        makeSegment({
          start: iso(2026, 7, 19, 11, 0),
          end: iso(2026, 7, 19, 11, 30),
          is_open: true,
        }),
      ],
      { now: NOW },
    );

    expect(event.endMinute).toBe(12 * 60);
    expect(event.endLabel).toBe("now");
    expect(event.isOpen).toBe(true);
  });

  it("splits a segment crossing local midnight into two clipped slices", () => {
    const events = toCalendarTimelineEvents(
      [
        makeSegment({
          start: iso(2026, 7, 15, 23, 0),
          end: iso(2026, 7, 16, 1, 0),
        }),
      ],
      { now: NOW },
    );

    expect(events).toHaveLength(2);
    expect(events[0].dateKey).toBe(localDateKey(new Date(2026, 6, 15)));
    expect(events[0].startMinute).toBe(23 * 60);
    expect(events[0].endMinute).toBe(24 * 60);
    expect(events[1].dateKey).toBe(localDateKey(new Date(2026, 6, 16)));
    expect(events[1].startMinute).toBe(0);
    expect(events[1].endMinute).toBe(60);
    expect(events[0].key).not.toBe(events[1].key);
  });

  it("places completion markers at exited_at, clipped into the segment", () => {
    const [event] = toCalendarTimelineEvents(
      [
        makeSegment({
          steps: [
            makeRecord({ ended_by: "completed" }),
            makeRecord({
              record_id: "ssr_2",
              task_id: "tsk_2",
              ended_by: "completed",
              // True exit after the segment end — must clip to 10:15.
              exited_at: iso(2026, 7, 15, 11, 0),
            }),
          ],
        }),
      ],
      { now: NOW },
    );

    expect(event.completions).toHaveLength(2);
    expect(event.completions[0].minute).toBe(10 * 60 + 15);
    expect(event.completions[1].minute).toBe(10 * 60 + 15);
    expect(event.singleTaskId).toBeNull();
    expect(event.recordCount).toBe(2);
  });

  it("selects the primary record by earliest clipped start with id tiebreak", () => {
    const [event] = toCalendarTimelineEvents(
      [
        makeSegment({
          steps: [
            makeRecord({
              record_id: "ssr_b",
              // Started before the segment — clips to the segment start,
              // tying with ssr_a's clipped start; id breaks the tie.
              entered_at: iso(2026, 7, 15, 8, 0),
              item: { client_id: "itm_2", article_number: "ART-B", sku: null },
            }),
            makeRecord({
              record_id: "ssr_a",
              entered_at: iso(2026, 7, 15, 9, 30),
              item: { client_id: "itm_3", article_number: "ART-A", sku: null },
            }),
          ],
        }),
      ],
      { now: NOW },
    );

    expect(event.primaryLabel).toBe("ART-A");
  });
});

describe("dayLastActivityMinute", () => {
  it("returns the end minute of the latest duration slice", () => {
    const events = toCalendarTimelineEvents(
      [
        makeSegment({ start: iso(2026, 7, 15, 9, 30), end: iso(2026, 7, 15, 10, 15) }),
        makeSegment({
          start: iso(2026, 7, 15, 11, 0),
          end: iso(2026, 7, 15, 11, 30),
          state: "idle",
          steps: [],
        }),
      ],
      { now: NOW },
    );

    expect(dayLastActivityMinute(events, DAY_KEY)).toBe(11 * 60 + 30);
  });

  it("uses a shift marker's instant as the edge", () => {
    const events = toCalendarTimelineEvents(
      [
        makeSegment({ start: iso(2026, 7, 15, 9, 30), end: iso(2026, 7, 15, 10, 15) }),
        {
          start: iso(2026, 7, 15, 13, 35),
          end: iso(2026, 7, 15, 13, 35),
          seconds: 0,
          state: "ended_shift",
          reason: null,
          is_open: false,
          manually_recorded: false,
          steps: [],
        },
      ],
      { now: NOW },
    );

    expect(dayLastActivityMinute(events, DAY_KEY)).toBe(13 * 60 + 35);
  });

  it("returns null for a day with no events", () => {
    expect(dayLastActivityMinute([], DAY_KEY)).toBeNull();
    const events = toCalendarTimelineEvents([makeSegment()], { now: NOW });
    expect(dayLastActivityMinute(events, "2026-07-16")).toBeNull();
  });
});

describe("computeVisibleTotals", () => {
  it("sums slice seconds per state over the visible dates only", () => {
    const events = toCalendarTimelineEvents(
      [
        makeSegment({ steps: [makeRecord({ ended_by: "completed" })] }),
        makeSegment({
          start: iso(2026, 7, 15, 11, 0),
          end: iso(2026, 7, 15, 11, 30),
          state: "paused",
          reason: "pause_lunch_break",
          steps: [makeRecord({ state: "paused" })],
        }),
        makeSegment({
          start: iso(2026, 7, 16, 9, 0),
          end: iso(2026, 7, 16, 10, 0),
          steps: [],
        }),
      ],
      { now: NOW },
    );

    const totals = computeVisibleTotals(events, [DAY_KEY]);
    expect(totals.workingSeconds).toBe(45 * 60);
    expect(totals.pauseSeconds).toBe(30 * 60);
    expect(totals.idleSeconds).toBe(0);
    expect(totals.completedCount).toBe(1);
  });
});

describe("validateTimelineTotals", () => {
  const timeline: WorkerLinearTimeline = {
    working_seconds: 2700,
    pause_seconds: 1800,
    ended_shift_seconds: 0,
    idle_seconds: 0,
    completed_count: 1,
    pause_by_reason: { pause_lunch_break: 1800 },
  };

  it("passes when segments reconcile with the totals", () => {
    const deviations = validateTimelineTotals(timeline, [
      makeSegment({ seconds: 2700 }),
      makeSegment({
        state: "paused",
        reason: "pause_lunch_break",
        seconds: 1800,
      }),
    ]);
    expect(deviations).toEqual([]);
  });

  it("reports state-sum and reason-sum deviations", () => {
    const deviations = validateTimelineTotals(
      { ...timeline, pause_by_reason: { pause_lunch_break: 900 } },
      [makeSegment({ seconds: 100 })],
    );
    expect(deviations.some((d) => d.startsWith("working_seconds"))).toBe(true);
    expect(deviations.some((d) => d.startsWith("pause_by_reason"))).toBe(true);
  });

  it("skips reconciliation while a segment is open", () => {
    const deviations = validateTimelineTotals(timeline, [
      makeSegment({ seconds: 100, is_open: true }),
    ]);
    expect(deviations).toEqual([]);
  });
});
