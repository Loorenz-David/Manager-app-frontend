import { useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { fetchWorkerLinearTimelineBreakdown } from "../api/fetch-worker-linear-timeline-breakdown";
import { useWorkerLinearTimelineBreakdownQuery } from "../api/use-worker-linear-timeline-breakdown-query";
import { workerStatsKeys } from "../api/worker-stats-keys";
import { addDaysToKey, minDateKey } from "../lib/time-line-calendar/local-date";
import {
  computeWindow,
  requestRangeUtc,
  windowCovers,
  type TimelineWindow,
} from "../lib/time-line-calendar/window";

const LIVE_REFETCH_INTERVAL_MS = 60_000;

type Options = {
  userId: string;
  visibleDates: string[];
  todayKey: string;
};

// Owns the five-day request window: hysteresis-driven movement, the query for
// the active window, neighbor prefetching, and the one-shot truncation
// narrowing (never an infinite retry loop).
export function useTimelineWindow({ userId, visibleDates, todayKey }: Options) {
  const [window, setWindow] = useState<TimelineWindow>(() =>
    computeWindow(visibleDates, todayKey),
  );
  // Set while the window is pinned to exactly the visible dates after a
  // truncated response; keyed by the visible dates so navigation unpins.
  const truncationPinRef = useRef<string | null>(null);
  const visibleKey = visibleDates.join("|");

  useEffect(() => {
    if (truncationPinRef.current === visibleKey) {
      return;
    }
    truncationPinRef.current = null;
    setWindow((current) =>
      windowCovers(current, visibleDates, todayKey)
        ? current
        : computeWindow(visibleDates, todayKey),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey, todayKey]);

  const request = requestRangeUtc(window);
  const includesToday = window.dateTo >= todayKey;
  const query = useWorkerLinearTimelineBreakdownQuery(
    { userId, dateFrom: request.dateFrom, dateTo: request.dateTo },
    { refetchInterval: includesToday ? LIVE_REFETCH_INTERVAL_MS : false },
  );

  // Truncated response: narrow once to exactly the visible dates. If even
  // that window is truncated, surface the terminal warning instead.
  const isTruncated = query.data?.segments_truncated ?? false;
  const isNarrowest =
    window.dateFrom === visibleDates[0] &&
    window.dateTo === visibleDates[visibleDates.length - 1];
  useEffect(() => {
    if (!isTruncated || isNarrowest) {
      return;
    }
    truncationPinRef.current = visibleKey;
    setWindow({
      dateFrom: visibleDates[0],
      dateTo: visibleDates[visibleDates.length - 1],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTruncated, isNarrowest, visibleKey]);

  // Prefetch the windows adjacent navigation would need next.
  const queryClient = useQueryClient();
  useEffect(() => {
    if (query.isPending) {
      return;
    }

    const span = visibleDates.length;
    const shifts = [
      visibleDates.map((date) => addDaysToKey(date, -span)),
      visibleDates.map((date) => minDateKey(addDaysToKey(date, span), todayKey)),
    ];
    for (const shifted of shifts) {
      if (windowCovers(window, shifted, todayKey)) {
        continue;
      }
      const range = requestRangeUtc(computeWindow(shifted, todayKey));
      void queryClient.prefetchQuery({
        queryKey: workerStatsKeys.linearTimelineBreakdown(userId, {
          dateFrom: range.dateFrom,
          dateTo: range.dateTo,
        }),
        queryFn: () =>
          fetchWorkerLinearTimelineBreakdown({
            userId,
            dateFrom: range.dateFrom,
            dateTo: range.dateTo,
          }),
        staleTime: 30_000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isPending, visibleKey, todayKey, userId, window, queryClient]);

  return {
    query,
    window,
    includesToday,
    isInitialLoading: query.isPending,
    isBackgroundLoading: query.isFetching && !query.isPending,
    isTruncatedTerminal: isTruncated && isNarrowest,
  };
}
