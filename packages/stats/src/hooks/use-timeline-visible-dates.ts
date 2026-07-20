import { useMemo, useState } from "react";

import {
  addDaysToKey,
  diffInDays,
  minDateKey,
  todayLocalKey,
} from "../lib/time-line-calendar/local-date";
import type { TimelinePagerPages } from "../lib/time-line-calendar/pager";
import {
  visibleDatesFor,
  type TimelineViewMode,
} from "../lib/time-line-calendar/window";

export type TimelineVisibleDatesOptions = {
  initialDate?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
};

// Owns the calendar's navigation state: view mode + focused date (the newest
// visible date). Parent-provided dates are an INITIAL anchor only — after
// mount this hook owns navigation. Phase 1 clamps at today; that clamp lives
// only here so future scheduling support can delete it in one place.
export function useTimelineVisibleDates(options: TimelineVisibleDatesOptions) {
  const todayKey = todayLocalKey();
  const [state, setState] = useState<{
    focusDate: string;
    mode: TimelineViewMode;
  }>(() => {
    const anchor =
      options.initialDate ??
      options.initialDateTo ??
      options.initialDateFrom ??
      todayKey;
    const spansRange = Boolean(
      !options.initialDate &&
        options.initialDateFrom &&
        options.initialDateTo &&
        options.initialDateFrom !== options.initialDateTo,
    );

    return {
      focusDate: minDateKey(anchor, todayKey),
      mode: spansRange ? "threeDay" : "day",
    };
  });

  const visibleDates = useMemo(
    () => visibleDatesFor(state.focusDate, state.mode),
    [state.focusDate, state.mode],
  );
  const span = state.mode === "day" ? 1 : 3;
  const canGoNext = state.focusDate < todayKey;
  // Days the focus can still advance before hitting the today clamp — the
  // pager caps fling (full-span) commits with this near the edge.
  const maxNextDays = Math.max(0, diffInDays(state.focusDate, todayKey));

  // Pager pages: the three pages form one CONTIGUOUS date strip (prev page
  // ends the day before the current page starts, next page starts the day
  // after it ends), so a settle of any step size (1 day controlled, full
  // span fling) lands on column boundaries. Next-page dates past today render
  // as empty columns during the drag preview; a commit never focuses them
  // (navigateBy clamps). No next page at all once focus is today.
  const pagerPages = useMemo<TimelinePagerPages>(() => {
    const prevFocus = addDaysToKey(state.focusDate, -span);
    const nextFocus = canGoNext ? addDaysToKey(state.focusDate, span) : null;

    return {
      prev: { key: prevFocus, dates: visibleDatesFor(prevFocus, state.mode) },
      current: { key: state.focusDate, dates: visibleDates },
      next: nextFocus
        ? { key: nextFocus, dates: visibleDatesFor(nextFocus, state.mode) }
        : null,
    };
  }, [state.focusDate, state.mode, span, canGoNext, visibleDates]);

  // Move the focus by a signed number of days, clamped at today. The pager
  // commits through this (1 day for a controlled slide, `span` for a fling);
  // the header buttons page by the full span.
  function navigateBy(deltaDays: number): void {
    setState((current) => ({
      ...current,
      focusDate: minDateKey(
        addDaysToKey(current.focusDate, deltaDays),
        todayLocalKey(),
      ),
    }));
  }

  function goNext(): void {
    navigateBy(span);
  }

  function goPrev(): void {
    navigateBy(-span);
  }

  // Date-picker selection: the tapped date becomes the focus (= newest
  // visible date, so threeDay shows D-2, D-1, D per the intention).
  function selectDate(dateKey: string, mode: TimelineViewMode): void {
    setState({ focusDate: minDateKey(dateKey, todayLocalKey()), mode });
  }

  // Mode switches preserve the focused date.
  function setMode(mode: TimelineViewMode): void {
    setState((current) => ({ ...current, mode }));
  }

  return {
    focusDate: state.focusDate,
    mode: state.mode,
    visibleDates,
    pagerPages,
    todayKey,
    canGoNext,
    maxNextDays,
    navigateBy,
    goNext,
    goPrev,
    selectDate,
    setMode,
  };
}
