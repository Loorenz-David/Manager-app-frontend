import { useEffect, useMemo } from "react";

import { ApiRequestError } from "@beyo/api-client";
import {
  usePreloadSurface,
  useSurfaceHeader,
  useSurfaceProps,
} from "@beyo/hooks";
import {
  TASK_DETAIL_SURFACE_ID,
  type TaskDetailSurfaceProps,
} from "@beyo/tasks";
import { useScrollHide, useSurfaceStore } from "@beyo/ui";

import { TimelineCalendarHeader } from "../components/time-line-calendar/TimelineCalendarHeader";
import { TimelineDateHeaderRow } from "../components/time-line-calendar/TimelineDateHeaderRow";
import { TimelineGrid } from "../components/time-line-calendar/TimelineGrid";
import { TimelineTotalsStrip } from "../components/time-line-calendar/TimelineTotalsStrip";
import { useCurrentMinute } from "../hooks/use-current-minute";
import { useTimelineVisibleDates } from "../hooks/use-timeline-visible-dates";
import { useTimelineWindow } from "../hooks/use-timeline-window";
import { formatTimelineDateLabel } from "../lib/time-line-calendar/date-labels";
import {
  computeVisibleTotals,
  toCalendarTimelineEvents,
  validateTimelineTotals,
  type CalendarTimelineEvent,
} from "../lib/time-line-calendar/segment-adapter";
import {
  preloadWorkerTimelineDateSheetSurface,
  preloadWorkerTimelineEventSheetSurface,
  WORKER_TIMELINE_DATE_SHEET_SURFACE_ID,
  WORKER_TIMELINE_EVENT_SHEET_SURFACE_ID,
  type WorkerTimelineDateSheetProps,
  type WorkerTimelineEventSheetProps,
  type WorkerTimelineSurfaceProps,
} from "../surface-ids";

// Keep in sync with the grid's 7rem bottom padding.
const FOOTER_EDGE_OFFSET_PX = 90;

// Footer — Pattern A (relative-mode scroll hide) with edge reveal. Because this
// page uses `useScrollHide({ revealAtEdge: "bottom" })`, the edge-aware progress
// is written to the FOOTER css vars — read those, not the core header vars
// (matches TaskDetailBottomActions). See architecture/36_scroll_visibility.md.
const FOOTER_STYLE: React.CSSProperties = {
  transform: "translateY(calc(var(--scroll-hide-progress-footer, 0) * 100%))",
  opacity: "calc(1 - var(--scroll-hide-progress-footer, 0))",
  transition:
    "transform var(--scroll-snap-duration-footer, var(--scroll-snap-duration, 0ms)) ease-out, opacity var(--scroll-snap-duration-footer, var(--scroll-snap-duration, 0ms)) ease-out",
};

// Overlay covering the (already-mounted) grid while the first window loads.
function TimelineGridSkeleton(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-40 flex flex-col gap-3 overflow-hidden bg-background px-4 pt-4"
      data-testid="timeline-grid-skeleton"
    >
      <div className="skeleton-shimmer h-6 w-56 rounded" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="skeleton-shimmer ml-12 rounded-lg"
          style={{ height: 64 + (index % 3) * 40 }}
        />
      ))}
    </div>
  );
}

export function WorkerTimelineSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const rawProps = useSurfaceProps<WorkerTimelineSurfaceProps>();
  const userId = rawProps.userId ?? "";

  const dates = useTimelineVisibleDates({
    initialDate: rawProps.initialDate,
    initialDateFrom: rawProps.initialDateFrom,
    initialDateTo: rawProps.initialDateTo,
  });
  const window = useTimelineWindow({
    userId,
    visibleDates: dates.visibleDates,
    todayKey: dates.todayKey,
  });
  const { scrollRef, isHidden, isAtEdge, hideProgressContainerRef } =
    useScrollHide({
      revealAtEdge: "bottom",
      edgeOffset: FOOTER_EDGE_OFFSET_PX,
    });
  const isFooterHidden = isHidden && !isAtEdge;

  usePreloadSurface(preloadWorkerTimelineDateSheetSurface);
  usePreloadSurface(preloadWorkerTimelineEventSheetSurface);

  useEffect(() => {
    // This page renders its own header; hide the surface header.
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = window.query.data ?? null;
  const now = useCurrentMinute(window.includesToday);

  const events = useMemo(
    () => (data ? toCalendarTimelineEvents(data.segments, { now }) : []),
    [data, now],
  );
  const totals = useMemo(
    () => computeVisibleTotals(events, dates.visibleDates),
    [events, dates.visibleDates],
  );

  // Contract observability: log reconciliation deviations, never block.
  useEffect(() => {
    if (!data) {
      return;
    }
    const deviations = validateTimelineTotals(data.timeline, data.segments);
    if (deviations.length > 0) {
      console.warn("[worker-timeline] totals deviation", deviations);
    }
  }, [data]);

  const username = rawProps.username ?? data?.user.username ?? "";
  const profilePicture =
    rawProps.profilePicture ?? data?.user.profile_picture ?? null;

  // Pager commits: a controlled slide steps 1 day, a fling pages by the span.
  function handleNavigate(direction: "prev" | "next", days: number): void {
    dates.navigateBy(direction === "next" ? days : -days);
  }

  function handleClose(): void {
    header?.requestClose();
  }

  function handleOpenDatePicker(): void {
    useSurfaceStore.getState().open(WORKER_TIMELINE_DATE_SHEET_SURFACE_ID, {
      selectedDate: dates.focusDate,
      mode: dates.mode,
      maxDate: dates.todayKey,
      onSelect: dates.selectDate,
    } satisfies WorkerTimelineDateSheetProps);
  }

  function handleSelectEvent(event: CalendarTimelineEvent): void {
    if (!event.isTaskActionable) {
      return;
    }

    // One actionable task → straight to task detail; several → chooser.
    if (event.singleTaskId) {
      useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, {
        taskId: event.singleTaskId,
      } satisfies TaskDetailSurfaceProps);
      return;
    }

    useSurfaceStore.getState().open(WORKER_TIMELINE_EVENT_SHEET_SURFACE_ID, {
      title: event.reasonLabel
        ? `${event.stateLabel} · ${event.reasonLabel}`
        : event.stateLabel,
      subtitle: `${event.startLabel} – ${event.endLabel} · ${event.durationLabel}`,
      records: event.records,
    } satisfies WorkerTimelineEventSheetProps);
  }

  const error = window.query.error;
  const isWorkerNotFound =
    error instanceof ApiRequestError && error.status === 404;

  // The grid (and its scroll container) is ALWAYS mounted so the footer's
  // hide-on-scroll listener binds on first render. Loading/error render as
  // full-surface overlays; the empty state lives INSIDE the grid's pages (so
  // it slides with the pager) and is enabled via `showEmptyState`. `data`-gated
  // chrome (totals strip, date header) only appears once there is data.
  const hasData = Boolean(data);
  let overlay: React.ReactNode = null;
  if (window.isInitialLoading) {
    overlay = <TimelineGridSkeleton />;
  } else if (window.query.isError && !data) {
    overlay = (
      <div
        className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background p-6 text-center"
        data-testid="timeline-error"
      >
        <p className="text-sm text-muted-foreground">
          {isWorkerNotFound
            ? "This worker could not be found."
            : "The timeline could not be loaded."}
        </p>
        {!isWorkerNotFound ? (
          <button
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground"
            type="button"
            onClick={() => {
              void window.query.refetch();
            }}
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-background"
      data-testid="worker-timeline-slide-page"
      ref={hideProgressContainerRef}
    >
      <TimelineCalendarHeader
        dateLabel={formatTimelineDateLabel(dates.visibleDates)}
        isBackgroundLoading={window.isBackgroundLoading}
        profilePicture={profilePicture}
        username={username}
        onOpenDatePicker={handleOpenDatePicker}
      />

      {hasData ? <TimelineTotalsStrip totals={totals} /> : null}
      {hasData && window.isTruncatedTerminal ? (
        <div
          className="border-b border-border bg-[#fdf3da] px-4 py-2 text-xs font-medium text-[#8a6410]"
          data-testid="timeline-truncated-warning"
        >
          This range is too detailed to show completely — try a single day.
        </div>
      ) : null}
      {hasData && dates.mode === "threeDay" ? (
        <TimelineDateHeaderRow
          dates={dates.visibleDates}
          focusDate={dates.focusDate}
          todayKey={dates.todayKey}
        />
      ) : null}

      <TimelineGrid
        events={events}
        maxNextDays={dates.maxNextDays}
        focusDate={dates.focusDate}
        mode={dates.mode}
        now={now}
        pages={dates.pagerPages}
        scrollRef={scrollRef}
        showEmptyState={hasData}
        todayKey={dates.todayKey}
        onNavigate={handleNavigate}
        onSelectEvent={handleSelectEvent}
      >
        {overlay}
      </TimelineGrid>

      {/* Footer — Pattern A: hides on scroll, reveals near the bottom edge.
          z above the loading/error overlays so Close stays reachable. */}
      <div
        className="absolute inset-x-0 bottom-0 z-50 will-change-transform"
        style={{
          ...FOOTER_STYLE,
          pointerEvents: isFooterHidden ? "none" : undefined,
        }}
      >
        <div className="px-4 py-3.5">
          <button
            className="w-full rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background shadow-sm"
            data-testid="worker-timeline-close"
            type="button"
            onClick={handleClose}
          >
            Close &amp; Back
          </button>
        </div>
        <div aria-hidden="true" className="h-(--safe-bottom,0px)" />
      </div>
    </div>
  );
}
