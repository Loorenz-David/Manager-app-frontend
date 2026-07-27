// Adapter between the linear-timeline backend contract and the calendar view
// model. Centralizes ISO parsing, local-timezone conversion, local-midnight
// splitting, record clipping, open-end extension, label selection, and stable
// render keys — event components never touch raw segments.

import { secondsToHM } from "../format-duration";
import {
  addDaysToKey,
  formatLocalTime,
  localDateKey,
  MINUTES_PER_DAY,
  minuteOfLocalDay,
  parseLocalDateKey,
} from "./local-date";
import { resolvePauseReasonLabel } from "./pause-reason-labels";
import type {
  PauseReasonLookupMap,
  WorkerLinearTimeline,
  WorkerLinearTimelineSegment,
  WorkerTimelineSegmentState,
} from "../../types";

export const TIMELINE_STATE_LABEL: Record<WorkerTimelineSegmentState, string> =
  {
    working: "Working",
    paused: "Paused",
    ended_shift: "Shift ended",
    started_shift: "Shift started",
    idle: "Idle",
  };

// Shift clock-in/clock-out states — rendered as a zero-height line marker at
// their timestamp, never as a filled duration block.
const SHIFT_MARKER_STATES: readonly WorkerTimelineSegmentState[] = [
  "started_shift",
  "ended_shift",
];

// One contributing StepStateRecord, display-ready and serializable (the event
// sheet receives these through surface props). Times shown here are the
// record's TRUE span — clipping applies only to calendar placement.
export type CalendarEventRecord = {
  recordId: string;
  stepId: string;
  taskId: string;
  workingSectionName: string | null;
  articleLabel: string | null;
  state: string;
  reasonLabel: string | null;
  // Free-text detail the worker typed alongside the pause reason.
  description: string | null;
  enteredAtLabel: string;
  exitedAtLabel: string | null;
  isOpen: boolean;
  isCompleted: boolean;
};

export type CalendarCompletion = {
  key: string;
  // Minute of the slice's local day (already clipped into the segment span).
  minute: number;
  label: string | null;
  recordId: string;
  taskId: string;
};

// One drawable calendar block: a per-local-day slice of a backend segment.
export type CalendarTimelineEvent = {
  key: string;
  dateKey: string;
  state: WorkerTimelineSegmentState;
  stateLabel: string;
  startMinute: number;
  endMinute: number;
  startLabel: string;
  endLabel: string;
  durationLabel: string;
  isOpen: boolean;
  reasonLabel: string | null;
  // Item-identity line: article number → SKU → working-section name → null.
  primaryLabel: string | null;
  workingSectionName: string | null;
  recordCount: number;
  records: CalendarEventRecord[];
  completions: CalendarCompletion[];
  // Single-task shortcut: set when exactly one distinct task contributes.
  singleTaskId: string | null;
  isTaskActionable: boolean;
  // A zero-duration shift clock-in/clock-out tick (rendered as a line marker,
  // not a duration block). `started_shift`/`ended_shift` only.
  isMarker: boolean;
  // `true` for an explicit worker shift pause; drives an optional "manual" cue.
  manuallyRecorded: boolean;
  // Future-overlap capability (Phase 1: always one full-width lane).
  laneIndex: number;
  laneCount: number;
  // A render-time group folding several colliding micro-events into one block
  // (see merge-events). Never set by the adapter; only the merge pass sets it.
  isMerged?: boolean;
};

function toCalendarEventRecord(
  record: WorkerLinearTimelineSegment["steps"][number],
): CalendarEventRecord {
  return {
    recordId: record.record_id,
    stepId: record.step_id,
    taskId: record.task_id,
    workingSectionName: record.working_section_name,
    articleLabel: record.item?.article_number ?? record.item?.sku ?? null,
    state: record.state,
    // Per-step detail carries the full nested pause reason object directly.
    reasonLabel: record.pause_reason?.name ?? null,
    description: record.description?.trim() || null,
    enteredAtLabel: formatLocalTime(new Date(record.entered_at)),
    exitedAtLabel: record.exited_at
      ? formatLocalTime(new Date(record.exited_at))
      : null,
    isOpen: record.is_open,
    isCompleted: record.ended_by === "completed",
  };
}

type StepCluster = {
  start: number;
  end: number;
  steps: WorkerLinearTimelineSegment["steps"];
};

// Group a segment's step records into clusters of time-overlapping steps (each
// clipped to the segment span). Overlapping steps share a cluster — drawn as
// one batch block; sequential steps land in separate clusters, drawn as
// consecutive blocks. Touching endpoints (a.end === b.start) count as
// sequential, not overlapping. The outer edges are clamped to the segment so
// the blocks tile it exactly (the backend guarantees a working/paused segment
// is fully covered by its steps).
function clusterSteps(
  steps: WorkerLinearTimelineSegment["steps"],
  segmentStart: Date,
  segmentEnd: Date,
): StepCluster[] {
  const segStartMs = segmentStart.getTime();
  const segEndMs = segmentEnd.getTime();

  const intervals = steps
    .map((step) => {
      const enteredMs = new Date(step.entered_at).getTime();
      const exitedMs = step.exited_at
        ? new Date(step.exited_at).getTime()
        : segEndMs;
      return {
        step,
        start: Math.max(enteredMs, segStartMs),
        end: Math.min(exitedMs, segEndMs),
      };
    })
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) =>
      a.start !== b.start
        ? a.start - b.start
        : a.step.record_id.localeCompare(b.step.record_id),
    );

  const clusters: StepCluster[] = [];
  for (const interval of intervals) {
    const last = clusters[clusters.length - 1];
    if (last && interval.start < last.end) {
      last.end = Math.max(last.end, interval.end);
      last.steps.push(interval.step);
    } else {
      clusters.push({
        start: interval.start,
        end: interval.end,
        steps: [interval.step],
      });
    }
  }

  if (clusters.length > 0) {
    clusters[0].start = Math.min(clusters[0].start, segStartMs);
    clusters[clusters.length - 1].end = Math.max(
      clusters[clusters.length - 1].end,
      segEndMs,
    );
  }

  return clusters;
}

export function toCalendarTimelineEvents(
  segments: WorkerLinearTimelineSegment[],
  options: { now: Date; pauseReasons?: PauseReasonLookupMap },
): CalendarTimelineEvent[] {
  const events: CalendarTimelineEvent[] = [];
  const pauseReasons = options.pauseReasons ?? {};

  for (const segment of segments) {
    const start = new Date(segment.start);
    const backendEnd = new Date(segment.end);

    // Shift markers are a single instant — positioned at `start`, zero height,
    // no records. Handled before the duration guard (which would drop them).
    if (SHIFT_MARKER_STATES.includes(segment.state)) {
      const markerDayKey = localDateKey(start);
      const minute = minuteOfLocalDay(start);
      events.push({
        key: `${segment.state}|${segment.start}`,
        dateKey: markerDayKey,
        state: segment.state,
        stateLabel: TIMELINE_STATE_LABEL[segment.state],
        startMinute: minute,
        endMinute: minute,
        startLabel: formatLocalTime(start),
        endLabel: formatLocalTime(start),
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
      });
      continue;
    }

    // Open blocks continue toward the client's "now" between refetches.
    const effectiveEnd =
      segment.is_open && options.now.getTime() > backendEnd.getTime()
        ? options.now
        : backendEnd;

    if (effectiveEnd.getTime() <= start.getTime()) {
      continue;
    }

    // A working/paused segment can carry several step records. Render one
    // block PER CLUSTER of time-overlapping steps: overlapping steps fuse into
    // a single batch block; sequential steps become consecutive blocks. Idle
    // (and any stepless) segments stay one block spanning the whole segment.
    const clusters = clusterSteps(segment.steps, start, effectiveEnd);
    const blocks =
      clusters.length > 0
        ? clusters.map((cluster, index) => ({
            start: new Date(cluster.start),
            end: new Date(cluster.end),
            steps: cluster.steps,
            // Only the last cluster reaches the segment's live edge.
            isOpen: segment.is_open && index === clusters.length - 1,
          }))
        : [
            {
              start,
              end: effectiveEnd,
              steps: [] as WorkerLinearTimelineSegment["steps"],
              isOpen: segment.is_open,
            },
          ];

    for (const block of blocks) {
      const { start: blockStart, end: blockEnd } = block;

      // Order records deterministically: earliest CLIPPED start, then record id.
      const sortedSteps = [...block.steps].sort((a, b) => {
        const aStart = Math.max(
          new Date(a.entered_at).getTime(),
          blockStart.getTime(),
        );
        const bStart = Math.max(
          new Date(b.entered_at).getTime(),
          blockStart.getTime(),
        );
        if (aStart !== bStart) {
          return aStart - bStart;
        }
        return a.record_id.localeCompare(b.record_id);
      });
      const records = sortedSteps.map(toCalendarEventRecord);
      const primary = records[0] ?? null;
      const taskIds = [...new Set(records.map((record) => record.taskId))];

      // Completions are transitions on working records: clip the completion
      // instant into the block span, then place it on that instant's day.
      const completions = sortedSteps
        .filter((step) => step.ended_by === "completed" && step.exited_at)
        .map((step) => {
          const exited = new Date(step.exited_at as string);
          const clipped = new Date(
            Math.min(
              Math.max(exited.getTime(), blockStart.getTime()),
              blockEnd.getTime(),
            ),
          );
          return {
            key: `completion|${step.record_id}`,
            dateKey: localDateKey(clipped),
            minute: minuteOfLocalDay(clipped),
            label: step.item?.article_number ?? step.item?.sku ?? null,
            recordId: step.record_id,
            taskId: step.task_id,
          };
        });

      // Split the block into local-day slices.
      let dayKey = localDateKey(blockStart);
      while (parseLocalDateKey(dayKey).getTime() < blockEnd.getTime()) {
        const dayStart = parseLocalDateKey(dayKey);
        const nextDayStart = parseLocalDateKey(addDaysToKey(dayKey, 1));
        const sliceStart =
          blockStart.getTime() > dayStart.getTime() ? blockStart : dayStart;
        const endsAtMidnight = blockEnd.getTime() >= nextDayStart.getTime();
        const sliceEnd = endsAtMidnight ? nextDayStart : blockEnd;

        if (sliceEnd.getTime() > sliceStart.getTime()) {
          const isLastSlice = !endsAtMidnight;
          const startMinute = minuteOfLocalDay(sliceStart);
          const endMinute = endsAtMidnight
            ? MINUTES_PER_DAY
            : minuteOfLocalDay(sliceEnd);
          const sliceSeconds = Math.round(
            (sliceEnd.getTime() - sliceStart.getTime()) / 1000,
          );
          const isOpenSlice = block.isOpen && isLastSlice;

          events.push({
            key: `${segment.state}|${segment.start}|${blockStart.toISOString()}|${dayKey}`,
            dateKey: dayKey,
            state: segment.state,
            stateLabel: TIMELINE_STATE_LABEL[segment.state],
            startMinute,
            endMinute,
            startLabel: formatLocalTime(sliceStart),
            endLabel: isOpenSlice ? "now" : formatLocalTime(sliceEnd),
            durationLabel: secondsToHM(sliceSeconds),
            isOpen: isOpenSlice,
            // Only paused blocks reach here with a reason (shift states are
            // markers handled above). Segment `reason` is a flat id resolved
            // against the response's `pause_reasons` lookup map.
            reasonLabel:
              segment.state === "paused"
                ? resolvePauseReasonLabel(segment.reason, pauseReasons)
                : null,
            primaryLabel:
              primary?.articleLabel ?? primary?.workingSectionName ?? null,
            workingSectionName: primary?.workingSectionName ?? null,
            recordCount: records.length,
            records,
            completions: completions.filter(
              (completion) => completion.dateKey === dayKey,
            ),
            singleTaskId: taskIds.length === 1 ? taskIds[0] : null,
            isTaskActionable: segment.state !== "idle" && taskIds.length > 0,
            isMarker: false,
            manuallyRecorded: segment.manually_recorded,
            laneIndex: 0,
            laneCount: 1,
          });
        }

        dayKey = addDaysToKey(dayKey, 1);
      }
    }
  }

  return events;
}

// The last recorded activity edge (minutes into the local day) for a date —
// the end of the latest duration slice, or a marker's instant. `null` when the
// day has no events. Used to tell whether "now" is past the day's activity
// (e.g. the shift has ended), so the live current-time line can stop there.
export function dayLastActivityMinute(
  events: CalendarTimelineEvent[],
  dateKey: string,
): number | null {
  let edge: number | null = null;
  for (const event of events) {
    if (event.dateKey !== dateKey) {
      continue;
    }
    const candidate = event.isMarker ? event.startMinute : event.endMinute;
    edge = edge === null ? candidate : Math.max(edge, candidate);
  }

  return edge;
}

// Visible-range totals for the header strip. The response's `timeline` covers
// the whole five-day request window, so the strip re-derives totals from the
// adapted slices of the dates actually on screen.
export type VisibleTimelineTotals = {
  workingSeconds: number;
  pauseSeconds: number;
  endedShiftSeconds: number;
  idleSeconds: number;
  completedCount: number;
};

export function computeVisibleTotals(
  events: CalendarTimelineEvent[],
  visibleDates: string[],
): VisibleTimelineTotals {
  const visible = new Set(visibleDates);
  const totals: VisibleTimelineTotals = {
    workingSeconds: 0,
    pauseSeconds: 0,
    endedShiftSeconds: 0,
    idleSeconds: 0,
    completedCount: 0,
  };

  for (const event of events) {
    if (event.isMarker || !visible.has(event.dateKey)) {
      continue;
    }

    const seconds = Math.round((event.endMinute - event.startMinute) * 60);
    if (event.state === "working") {
      totals.workingSeconds += seconds;
    } else if (event.state === "paused") {
      totals.pauseSeconds += seconds;
    } else if (event.state === "ended_shift") {
      totals.endedShiftSeconds += seconds;
    } else {
      totals.idleSeconds += seconds;
    }
    totals.completedCount += event.completions.length;
  }

  return totals;
}

// Dev/test contract check: segments must reconcile with the window totals and
// pause_by_reason must sum to pause_seconds. Never blocks rendering — callers
// log deviations per the frontend observability conventions.
export function validateTimelineTotals(
  timeline: WorkerLinearTimeline,
  segments: WorkerLinearTimelineSegment[],
): string[] {
  const deviations: string[] = [];
  const sums: Record<WorkerTimelineSegmentState, number> = {
    working: 0,
    paused: 0,
    ended_shift: 0,
    started_shift: 0,
    idle: 0,
  };

  for (const segment of segments) {
    // Open segments keep accruing after serialization; skip reconciliation.
    if (segment.is_open) {
      return deviations;
    }
    sums[segment.state] += segment.seconds;
  }

  const expectations: [string, number, number][] = [
    ["working_seconds", sums.working, timeline.working_seconds],
    ["pause_seconds", sums.paused, timeline.pause_seconds],
    ["ended_shift_seconds", sums.ended_shift, timeline.ended_shift_seconds],
    ["idle_seconds", sums.idle, timeline.idle_seconds],
  ];
  for (const [field, actual, expected] of expectations) {
    if (actual !== expected) {
      deviations.push(`${field}: segments sum ${actual} !== totals ${expected}`);
    }
  }

  const reasonSum = Object.values(timeline.pause_by_reason).reduce(
    (sum, value) => sum + value,
    0,
  );
  if (reasonSum !== timeline.pause_seconds) {
    deviations.push(
      `pause_by_reason: sum ${reasonSum} !== pause_seconds ${timeline.pause_seconds}`,
    );
  }

  return deviations;
}
