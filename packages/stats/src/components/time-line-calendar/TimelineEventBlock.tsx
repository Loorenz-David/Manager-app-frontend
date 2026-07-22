import {
  computeEventLayout,
  eventLineBudget,
  groupMarkerMinutes,
  markerOffsetWithinEventPx,
  MIN_COMPLETED_EVENT_VISUAL_PX,
} from "../../lib/time-line-calendar/geometry";
import type { CalendarTimelineEvent } from "../../lib/time-line-calendar/segment-adapter";
import type { TimelineViewMode } from "../../lib/time-line-calendar/window";
import type { WorkerTimelineSegmentState } from "../../types";

// Mockup palette (20260719): blue working blocks with a solid left accent
// bar, amber paused, gray-striped idle. Shift start/end render as line markers
// (TimelineShiftMarker), never through this component.
const STATE_STYLES: Record<
  Exclude<WorkerTimelineSegmentState, "ended_shift" | "started_shift">,
  { container: string; bar: string; title: string }
> = {
  working: {
    container: "bg-[#eaf1fd] text-[#41546e]",
    bar: "bg-[#2f6fed]",
    title: "text-[#2f6fed]",
  },
  paused: {
    container: "bg-[#fdf3da] text-[#8a6410]",
    bar: "bg-[#e8930c]",
    title: "text-[#a16207]",
  },
  idle: {
    container:
      "border border-dashed border-border bg-muted/40 text-muted-foreground",
    bar: "",
    title: "text-muted-foreground",
  },
};

const IDLE_STRIPES: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(120,120,130,0.08) 6px, rgba(120,120,130,0.08) 12px)",
};

export type TimelineEventBlockProps = {
  event: CalendarTimelineEvent;
  density: TimelineViewMode;
  pxPerMinute: number;
  onSelect?: (event: CalendarTimelineEvent) => void;
};

function accessibleName(event: CalendarTimelineEvent): string {
  const parts = [event.stateLabel];
  if (event.reasonLabel) {
    parts.push(event.reasonLabel);
  }
  if (event.primaryLabel) {
    parts.push(event.primaryLabel);
  }
  parts.push(`${event.startLabel} to ${event.endLabel}`, event.durationLabel);
  if (event.recordCount > 1) {
    parts.push(`${event.recordCount} records`);
  }
  if (event.completions.length > 0) {
    parts.push(`${event.completions.length} completed`);
  }
  if (event.isOpen) {
    parts.push("in progress");
  }

  return parts.join(", ");
}

// One drawable calendar block. The visual block never lies about duration;
// short events stay tappable through a separate, invisible hit-target
// overlay sized independently of the visual height.
export function TimelineEventBlock({
  event,
  density,
  pxPerMinute,
  onSelect,
}: TimelineEventBlockProps): React.JSX.Element {
  const hasCompletions = event.completions.length > 0;
  // A completed or merged micro-event gets a taller floor so its content (✓
  // pill / group label) isn't clipped by the block's overflow-hidden; plain
  // micro-events keep the default sliver.
  const needsTallFloor = hasCompletions || event.isMerged;
  const layout = computeEventLayout(
    event.startMinute,
    event.endMinute,
    pxPerMinute,
    needsTallFloor ? MIN_COMPLETED_EVENT_VISUAL_PX : undefined,
  );
  const styles = STATE_STYLES[event.state as keyof typeof STATE_STYLES];
  // Stack shorter events above longer ones so an inflated micro-block is never
  // painted over by the larger (e.g. idle) segment that follows it in the day.
  // Real height, not the inflated height, drives the order.
  const realHeightPx = (event.endMinute - event.startMinute) * pxPerMinute;
  const zIndex = Math.max(1, Math.round(400 - realHeightPx));
  const isCompact = density === "threeDay";
  const isActionable = Boolean(onSelect) && event.isTaskActionable;
  // Show only as many content lines as the block height fits, so the last
  // visible line is always whole. Lines drop from the bottom in source order.
  const maxLines = eventLineBudget(layout.height);

  const markerGroups = groupMarkerMinutes(
    event.completions.map((completion) => ({
      minute: completion.minute,
      label: completion.label,
    })),
  );

  const title = event.isMerged
    ? `${event.recordCount} steps`
    : event.reasonLabel
      ? isCompact
        ? `${event.stateLabel} ${event.durationLabel}`
        : `${event.stateLabel} · ${event.reasonLabel}`
      : event.stateLabel;
  const idleTitle = isCompact
    ? `${event.stateLabel} ${event.durationLabel}`
    : `${event.stateLabel} · no activity detected`;

  // Content lines in visual (source) order; only the first `maxLines` render.
  const contentLines: React.ReactNode[] = [];
  if (event.state === "idle") {
    contentLines.push(
      <div
        key="title"
        className="flex min-w-0 items-baseline justify-between gap-2"
      >
        <p className="min-w-0 truncate text-xs font-semibold">{idleTitle}</p>
        {!isCompact ? (
          <span className="shrink-0 text-xs font-medium">
            {event.durationLabel}
          </span>
        ) : null}
      </div>,
    );
  } else {
    contentLines.push(
      <div
        key="title"
        className="flex min-w-0 items-baseline justify-between gap-2"
      >
        <p className={`min-w-0 truncate text-xs font-semibold ${styles.title}`}>
          {title}
        </p>
        {event.state === "paused" && !isCompact ? (
          <span className="shrink-0 text-xs font-medium">
            {event.durationLabel}
          </span>
        ) : null}
      </div>,
    );
    if (event.state !== "paused" || isCompact) {
      contentLines.push(
        <p key="time" className="min-w-0 truncate text-xs">
          {isCompact
            ? event.durationLabel
            : `${event.startLabel} – ${event.endLabel} · ${event.durationLabel}`}
          {!event.isMerged && event.recordCount > 1
            ? ` · ${event.recordCount} records`
            : ""}
        </p>,
      );
    }
    if (event.primaryLabel) {
      contentLines.push(
        <p key="item" className="min-w-0 truncate text-xs text-muted-foreground">
          {event.primaryLabel}
          {!isCompact &&
          event.workingSectionName &&
          event.workingSectionName !== event.primaryLabel
            ? ` · ${event.workingSectionName}`
            : ""}
        </p>,
      );
    }
  }
  const visibleLines = contentLines.slice(0, maxLines);

  return (
    <>
      <div
        aria-hidden={isActionable ? true : undefined}
        className={`pointer-events-none absolute inset-x-0.5 overflow-hidden rounded-lg ${styles.container} ${
          hasCompletions ? "border-b border-b-[#2fa15c]" : ""
        } ${event.isOpen ? "ring-1 ring-current/30" : ""}`}
        data-testid={`timeline-event-${event.key}`}
        style={{
          top: layout.top,
          height: layout.height,
          zIndex,
          ...(event.state === "idle" ? IDLE_STRIPES : {}),
        }}
      >
        {styles.bar ? (
          <span
            aria-hidden="true"
            className={`absolute inset-y-0.5 left-0.5 w-1 rounded-full ${styles.bar} ${
              event.isOpen ? "animate-pulse" : ""
            }`}
          />
        ) : null}

        {visibleLines.length > 0 ? (
          <div
            className={`flex h-full min-w-0 flex-col gap-0.5 py-1 pr-2 ${styles.bar ? "pl-3" : "pl-2"}`}
          >
            {visibleLines}
          </div>
        ) : null}

        {/* Completion markers — clipped into the block, grouped on overlap. */}
        {markerGroups.map((group) => (
          <span
            key={group.minute}
            className="absolute right-1 inline-flex items-center gap-1 rounded-full bg-[#dff3e6] px-2 py-0.5 text-[10px] font-semibold text-[#1e7a46]"
            style={{
              top: Math.max(
                2,
                Math.min(
                  markerOffsetWithinEventPx(
                    group.minute,
                    event.startMinute,
                    event.endMinute,
                    pxPerMinute,
                  ) - 18,
                  layout.height - 20,
                ),
              ),
            }}
          >
            ✓{" "}
            {group.items.length > 1
              ? `${group.items.length} completed`
              : isCompact || !group.items[0].label
                ? "Done"
                : `${group.items[0].label} done`}
          </span>
        ))}
      </div>

      {isActionable ? (
        <button
          aria-label={accessibleName(event)}
          className="absolute inset-x-0.5 rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
          data-testid={`timeline-event-hit-${event.key}`}
          style={{ top: layout.hitTop, height: layout.hitHeight, zIndex }}
          type="button"
          onClick={() => onSelect?.(event)}
        />
      ) : null}
    </>
  );
}
