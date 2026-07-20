import { useEffect, useRef } from "react";

import { minuteToOffsetPx } from "../../lib/time-line-calendar/geometry";
import { minuteOfLocalDay } from "../../lib/time-line-calendar/local-date";
import type { TimelinePagerPages } from "../../lib/time-line-calendar/pager";
import {
  dayLastActivityMinute,
  type CalendarTimelineEvent,
} from "../../lib/time-line-calendar/segment-adapter";
import type { TimelineViewMode } from "../../lib/time-line-calendar/window";
import { TimelineDayColumn } from "./TimelineDayColumn";
import { TimelineEmptyState } from "./TimelineEmptyState";
import { TimelineEventBlock } from "./TimelineEventBlock";
import { TimelineHourGutter } from "./TimelineHourGutter";
import { TimelineNowIndicator } from "./TimelineNowIndicator";
import { TimelineShiftMarker } from "./TimelineShiftMarker";
import { TimelineZoomControl } from "./TimelineZoomControl";
import { useTimelinePager } from "./use-timeline-pager";
import { useTimelineVerticalZoom } from "./use-timeline-vertical-zoom";

const DEFAULT_START_HOUR = 7;
const TOP_PADDING_PX = 24;

export type TimelineGridProps = {
  pages: TimelinePagerPages;
  focusDate: string;
  mode: TimelineViewMode;
  // Window-wide events — each page filters its own dates, so neighbor pages
  // render real content while they slide in.
  events: CalendarTimelineEvent[];
  now: Date;
  todayKey: string;
  // Days the focus can still advance before the today clamp (0 = clamped).
  maxNextDays: number;
  // Render the per-page empty state (only once data has loaded — during
  // loading/error the overlay covers the grid).
  showEmptyState: boolean;
  onNavigate: (direction: "prev" | "next", days: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onSelectEvent: (event: CalendarTimelineEvent) => void;
  children?: React.ReactNode;
};

// The scrollable 24-hour body. Vertical scrolling is native on the outer
// container; the day columns live on a horizontally sliding track (prev |
// current | next page) behind a fixed hour gutter — a horizontal drag pans
// the dates and settles page-by-page (Google-Calendar style, see
// use-timeline-pager), a two-finger pinch zooms the time axis (see
// use-timeline-vertical-zoom), and the +/- control is the non-gesture zoom.
export function TimelineGrid({
  pages,
  focusDate,
  mode,
  events,
  now,
  todayKey,
  maxNextDays,
  showEmptyState,
  onNavigate,
  scrollRef,
  onSelectEvent,
  children,
}: TimelineGridProps): React.JSX.Element {
  const pager = useTimelinePager({
    spanDays: mode === "day" ? 1 : 3,
    maxNextDays,
    onNavigate,
  });
  const zoom = useTimelineVerticalZoom(scrollRef);

  // Initial scroll: one hour above the focused date's first event, else a
  // standard workday start. Applied once — afterwards the user's vertical
  // position is preserved across date navigation, mode switches, and zoom.
  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (hasScrolledRef.current) {
      return;
    }
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    hasScrolledRef.current = true;

    const firstEventMinute = events
      .filter((event) => event.dateKey === focusDate)
      .reduce<number | null>(
        (min, event) =>
          min === null ? event.startMinute : Math.min(min, event.startMinute),
        null,
      );
    const targetMinute =
      firstEventMinute !== null
        ? Math.max(firstEventMinute - 60, 0)
        : DEFAULT_START_HOUR * 60;
    element.scrollTop = minuteToOffsetPx(targetMinute, zoom.pxPerMinute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDate, events]);

  // The live current-time line only makes sense while today's shift is still
  // running. Once "now" is past the day's last recorded edge (e.g. after the
  // ended-shift marker), drop it — otherwise it dangles just past the
  // shift-end tick and the two red lines collide.
  const lastEdge = dayLastActivityMinute(events, todayKey);
  const shiftConcluded = lastEdge !== null && minuteOfLocalDay(now) > lastEdge;
  const showNowLine = mode === "day" && !shiftConcluded;

  const pageList = [
    pages.prev,
    pages.current,
    ...(pages.next ? [pages.next] : []),
  ];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-none"
        data-testid="timeline-grid"
        ref={scrollRef}
        style={{ touchAction: "pan-y" }}
        {...zoom.pinchHandlers}
      >
        <div
          className="flex"
          style={{
            paddingTop: TOP_PADDING_PX,
            paddingBottom: "calc(var(--safe-bottom,0px) + 7rem)",
          }}
        >
          <TimelineHourGutter pxPerHour={zoom.pxPerHour} />
          <div
            className="relative min-w-0 flex-1 overflow-hidden"
            data-testid="timeline-pager-viewport"
            ref={pager.viewportRef}
            {...pager.handlers}
          >
            {/* Track rests at -100% (one page width) so the current page —
                always index 1 — fills the viewport; the pager drags it in px
                and returns it to this rest transform after settling. */}
            <div
              className="flex will-change-transform"
              ref={pager.trackRef}
              style={{ transform: "translateX(-100%)" }}
            >
              {pageList.map((page) => (
                <div
                  key={page.key}
                  className="relative flex w-full shrink-0"
                  data-testid={`timeline-page-${page.key}`}
                >
                  {showEmptyState &&
                  !events.some((event) => page.dates.includes(event.dateKey)) ? (
                    <TimelineEmptyState />
                  ) : null}
                  {page.dates.map((dateKey) => (
                    <TimelineDayColumn
                      key={dateKey}
                      pxPerHour={zoom.pxPerHour}
                      testId={`timeline-day-${dateKey}`}
                    >
                      {events
                        .filter((event) => event.dateKey === dateKey)
                        .map((event) =>
                          event.isMarker ? (
                            <TimelineShiftMarker
                              key={event.key}
                              density={mode}
                              event={event}
                              pxPerMinute={zoom.pxPerMinute}
                            />
                          ) : (
                            <TimelineEventBlock
                              key={event.key}
                              density={mode}
                              event={event}
                              pxPerMinute={zoom.pxPerMinute}
                              onSelect={onSelectEvent}
                            />
                          ),
                        )}
                      {showNowLine && dateKey === todayKey ? (
                        <TimelineNowIndicator
                          now={now}
                          pxPerMinute={zoom.pxPerMinute}
                        />
                      ) : null}
                    </TimelineDayColumn>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <TimelineZoomControl
        canZoomIn={zoom.canZoomIn}
        canZoomOut={zoom.canZoomOut}
        onZoomIn={zoom.zoomIn}
        onZoomOut={zoom.zoomOut}
      />
      {/* Loading / error / empty overlays live in the wrapper (not the scroll
          content) so the scroll container stays mounted the whole time — its
          scroll listener, and therefore the footer's hide-on-scroll, binds on
          first mount instead of missing a late-mounting scroll element. */}
      {children}
    </div>
  );
}
