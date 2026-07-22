import { describe, expect, it } from "vitest";

import { pxPerMinuteOf, DEFAULT_PX_PER_HOUR } from "./geometry";
import { mergeCollidingEvents } from "./merge-events";
import type {
  CalendarCompletion,
  CalendarEventRecord,
  CalendarTimelineEvent,
} from "./segment-adapter";

const PPM = pxPerMinuteOf(DEFAULT_PX_PER_HOUR); // 1.6 px/min

function record(
  overrides: Partial<CalendarEventRecord> = {},
): CalendarEventRecord {
  return {
    recordId: "ssr_1",
    stepId: "tsp_1",
    taskId: "tsk_1",
    workingSectionName: "wood fix",
    articleLabel: "0000874",
    state: "working",
    reasonLabel: null,
    description: null,
    enteredAtLabel: "13:39",
    exitedAtLabel: "13:39",
    isOpen: false,
    isCompleted: true,
    ...overrides,
  };
}

function completion(
  overrides: Partial<CalendarCompletion> = {},
): CalendarCompletion {
  return {
    key: "completion|ssr_1",
    minute: 13 * 60 + 39,
    label: "0000874",
    recordId: "ssr_1",
    taskId: "tsk_1",
    ...overrides,
  };
}

// A minimal drawable event; `startMinute`/`endMinute` and `records` are what
// the merge pass reasons about, the rest are display carry-through.
function event(
  overrides: Partial<CalendarTimelineEvent> = {},
): CalendarTimelineEvent {
  const startMinute = overrides.startMinute ?? 0;
  const endMinute = overrides.endMinute ?? 1;
  return {
    key: `evt|${startMinute}|${endMinute}`,
    dateKey: "2026-07-21",
    state: "working",
    stateLabel: "Working",
    startMinute,
    endMinute,
    startLabel: "13:39",
    endLabel: "13:39",
    durationLabel: "1s",
    isOpen: false,
    reasonLabel: null,
    primaryLabel: null,
    workingSectionName: null,
    recordCount: 1,
    records: [record()],
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

function idle(startMinute: number, endMinute: number): CalendarTimelineEvent {
  return event({
    startMinute,
    endMinute,
    state: "idle",
    stateLabel: "Idle",
    records: [],
    recordCount: 0,
    singleTaskId: null,
    isTaskActionable: false,
  });
}

describe("mergeCollidingEvents", () => {
  it("folds a run of colliding micro working steps into one group block", () => {
    // The real cluster shape: three seconds-long completed steps split by tiny
    // idle gaps — all micro at the default scale.
    const start = 13 * 60 + 39;
    const events = [
      event({
        startMinute: start,
        endMinute: start + 0.2,
        records: [record({ recordId: "a", taskId: "t1" })],
        completions: [completion({ recordId: "a", taskId: "t1" })],
      }),
      idle(start + 0.2, start + 0.4),
      event({
        startMinute: start + 0.4,
        endMinute: start + 0.6,
        records: [record({ recordId: "b", taskId: "t2" })],
        completions: [completion({ recordId: "b", taskId: "t2" })],
      }),
      idle(start + 0.6, start + 2),
      event({
        startMinute: start + 2,
        endMinute: start + 2.6,
        records: [record({ recordId: "c", taskId: "t3" })],
        completions: [completion({ recordId: "c", taskId: "t3" })],
      }),
    ];

    const merged = mergeCollidingEvents(events, PPM);

    expect(merged).toHaveLength(1);
    const group = merged[0];
    expect(group.isMerged).toBe(true);
    expect(group.state).toBe("working");
    expect(group.recordCount).toBe(3);
    expect(group.completions).toHaveLength(3);
    // Span covers the whole run; the idle gaps are absorbed.
    expect(group.startMinute).toBe(start);
    expect(group.endMinute).toBe(start + 2.6);
    // Distinct tasks → the event sheet (no single-task shortcut).
    expect(group.singleTaskId).toBeNull();
    expect(group.isTaskActionable).toBe(true);
  });

  it("keeps a single-task run's shortcut so a tap opens task detail", () => {
    const start = 13 * 60 + 39;
    const events = [
      event({ startMinute: start, endMinute: start + 0.2 }),
      idle(start + 0.2, start + 0.4),
      event({ startMinute: start + 0.4, endMinute: start + 0.6 }),
    ];

    const merged = mergeCollidingEvents(events, PPM);
    expect(merged).toHaveLength(1);
    expect(merged[0].singleTaskId).toBe("tsk_1");
  });

  it("leaves legible events untouched", () => {
    const events = [
      idle(0, 120),
      event({ startMinute: 120, endMinute: 180 }), // 60 min — clearly legible
      idle(180, 300),
    ];

    const merged = mergeCollidingEvents(events, PPM);
    expect(merged).toHaveLength(3);
    expect(merged.every((e) => !e.isMerged)).toBe(true);
  });

  it("does not merge a lone micro step beside idle (nothing to collapse)", () => {
    const start = 500;
    const events = [
      idle(start, start + 0.2),
      event({ startMinute: start + 0.2, endMinute: start + 0.4 }),
      idle(start + 0.4, 800), // long, legible idle ends the run
    ];

    const merged = mergeCollidingEvents(events, PPM);
    // One micro run of [idle, work] has a single record-bearing member → passed
    // through as-is, plus the legible trailing idle.
    expect(merged.filter((e) => e.isMerged)).toHaveLength(0);
    expect(merged).toHaveLength(3);
  });

  it("dissolves the group when zoomed in enough that steps are legible", () => {
    const start = 13 * 60 + 39;
    const events = [
      event({ startMinute: start, endMinute: start + 6 }),
      idle(start + 6, start + 12),
      event({ startMinute: start + 6, endMinute: start + 12 }),
    ];

    // At a high scale a 6-minute step clears the micro threshold → no merge.
    const zoomedPpm = pxPerMinuteOf(600);
    const merged = mergeCollidingEvents(events, zoomedPpm);
    expect(merged.every((e) => !e.isMerged)).toBe(true);
  });

  it("passes shift markers through untouched", () => {
    const marker = event({
      startMinute: 400,
      endMinute: 400,
      state: "started_shift",
      stateLabel: "Shift started",
      isMarker: true,
      records: [],
      recordCount: 0,
      isTaskActionable: false,
    });
    const events = [
      marker,
      event({ startMinute: 401, endMinute: 401.2 }),
      idle(401.2, 401.4),
      event({ startMinute: 401.4, endMinute: 401.6 }),
    ];

    const merged = mergeCollidingEvents(events, PPM);
    expect(merged.some((e) => e.isMarker)).toBe(true);
    expect(merged.some((e) => e.isMerged)).toBe(true);
  });
});
