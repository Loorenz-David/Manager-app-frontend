// Render-time collapsing of colliding micro-events into a single group block.
//
// At a given zoom, a run of seconds-long segments inflates past its real height
// (see geometry's MIN_* floors) and the blocks pile onto the same few pixels —
// individually unreadable and mutually occluding. This pass folds such a run
// into one "N steps" block that carries every contributing record, so a tap
// still reaches the underlying tasks. It is zoom-aware (fed `pxPerMinute`): zoom
// in and the members grow past the micro threshold, so the group dissolves back
// into individual blocks. Totals are always derived from the raw events — this
// only changes what is DRAWN.

import { secondsToHM } from "../format-duration";
import {
  TIMELINE_STATE_LABEL,
  type CalendarTimelineEvent,
} from "./segment-adapter";
import { MINUTES_PER_DAY } from "./local-date";

// A segment whose real (un-inflated) pixel height is below this is "micro":
// too short to read on its own, hence a merge candidate. ~5 min at the default
// scale; shrinks in real minutes as the user zooms in.
export const MICRO_REAL_HEIGHT_PX = 8;

function realHeightPx(
  event: CalendarTimelineEvent,
  pxPerMinute: number,
): number {
  return (event.endMinute - event.startMinute) * pxPerMinute;
}

// Merge a run of adjacent micro-events into one drawable group event. The span
// covers the whole run (absorbing the tiny idle gaps between the steps); every
// record and completion carries through so the event sheet / task shortcut work
// exactly as they do for a normal multi-record block.
function buildMergedEvent(run: CalendarTimelineEvent[]): CalendarTimelineEvent {
  const first = run[0];
  const last = run.reduce((latest, event) =>
    event.endMinute > latest.endMinute ? event : latest,
  );

  const records = run.flatMap((event) => event.records);
  const completions = run.flatMap((event) => event.completions);
  const taskIds = [...new Set(records.map((record) => record.taskId))];

  // Working dominates paused dominates idle — the group reads as work when any
  // real step contributed, which is the whole reason to surface it.
  const state = run.some((event) => event.state === "working")
    ? "working"
    : run.some((event) => event.state === "paused")
      ? "paused"
      : "idle";

  const startMinute = first.startMinute;
  const endMinute = last.endMinute;
  const spanSeconds = Math.round(
    (Math.min(endMinute, MINUTES_PER_DAY) - startMinute) * 60,
  );

  return {
    key: `merged|${first.dateKey}|${startMinute}|${endMinute}`,
    dateKey: first.dateKey,
    state,
    stateLabel: TIMELINE_STATE_LABEL[state],
    startMinute,
    endMinute,
    startLabel: first.startLabel,
    endLabel: last.endLabel,
    durationLabel: secondsToHM(spanSeconds),
    isOpen: false,
    reasonLabel: null,
    primaryLabel: null,
    workingSectionName: null,
    recordCount: records.length,
    records,
    completions,
    singleTaskId: taskIds.length === 1 ? taskIds[0] : null,
    isTaskActionable: state !== "idle" && taskIds.length > 0,
    isMarker: false,
    manuallyRecorded: false,
    laneIndex: 0,
    laneCount: 1,
    isMerged: true,
  };
}

// Collapse colliding micro-event runs for ONE day. Markers pass through
// untouched (zero-height line ticks). A run merges only when it carries at
// least two record-bearing steps — a lone short step beside idle stays itself,
// since the z-ordering already keeps it above the idle drawn after it.
export function mergeCollidingEvents(
  dayEvents: CalendarTimelineEvent[],
  pxPerMinute: number,
): CalendarTimelineEvent[] {
  const markers = dayEvents.filter((event) => event.isMarker);
  const blocks = dayEvents
    .filter((event) => !event.isMarker)
    .sort((a, b) =>
      a.startMinute !== b.startMinute
        ? a.startMinute - b.startMinute
        : a.endMinute - b.endMinute,
    );

  const result: CalendarTimelineEvent[] = [];
  let i = 0;
  while (i < blocks.length) {
    if (realHeightPx(blocks[i], pxPerMinute) >= MICRO_REAL_HEIGHT_PX) {
      result.push(blocks[i]);
      i += 1;
      continue;
    }

    // Maximal run of consecutive micro blocks.
    let j = i;
    while (
      j < blocks.length &&
      realHeightPx(blocks[j], pxPerMinute) < MICRO_REAL_HEIGHT_PX
    ) {
      j += 1;
    }
    const run = blocks.slice(i, j);
    const recordBearing = run.filter(
      (event) => event.records.length > 0,
    ).length;

    if (recordBearing >= 2) {
      result.push(buildMergedEvent(run));
    } else {
      result.push(...run);
    }
    i = j;
  }

  return [...result, ...markers];
}
