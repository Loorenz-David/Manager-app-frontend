import { useEffect, useMemo, useState } from "react";

import { Calendar } from "lucide-react";
import {
  usePreloadSurface,
  useSurfaceHeader,
  useSurfaceProps,
} from "@beyo/hooks";
import { notify } from "@beyo/lib";
import {
  TASK_DETAIL_SURFACE_ID,
  type TaskDetailSurfaceProps,
} from "@beyo/tasks";
import {
  PullToRefresh,
  useScrollHide,
  useSurfaceStore,
} from "@beyo/ui";

import { useWorkerStatsRoster } from "../hooks/use-worker-stats-roster";
import { WorkerStatsCard } from "../components/WorkerStatsCard";
import type { WorkerStatsCardViewModel } from "../lib/worker-stats-dto";
import { dateRangeLabel, todayRange } from "../lib/worker-stats-date-range";
import { WORKER_STATS_QUICK_RANGE_OPTIONS } from "../lib/worker-stats-quick-ranges";
import {
  preloadWorkerStatsGranularitySlideSurface,
  WORKER_STATS_GRANULARITY_SLIDE_SURFACE_ID,
  WORKER_STATS_INSIGHTS_SHEET_SURFACE_ID,
  type WorkerStatsSlideSurfaceProps,
  type WorkerStatsGranularitySurfaceProps,
  type WorkerStatsInsightsSheetProps,
} from "../surface-ids";
import type { WorkerGranularityIntention, WorkerStatsDateRange } from "../types";

function openGranularitySlide(
  worker: WorkerStatsCardViewModel,
  intention: WorkerGranularityIntention,
  range: WorkerStatsDateRange,
): void {
  // Totals are not passed — the granularity page derives them (per selected
  // time strategy) from its own daily-steps response.
  useSurfaceStore.getState().open(WORKER_STATS_GRANULARITY_SLIDE_SURFACE_ID, {
    userId: worker.userId,
    username: worker.username,
    profilePicture: worker.profilePicture,
    stepStateLabel:
      worker.step.status === "ready" ? worker.step.data?.stepStateLabel ?? null : null,
    stepStateVariant:
      worker.step.status === "ready" ? worker.step.data?.stepStateVariant ?? null : null,
    ticker: worker.step.status === "ready" ? worker.step.data?.ticker ?? null : null,
    initialIntention: intention,
    dateFrom: range.from,
    dateTo: range.to,
  } satisfies WorkerStatsGranularitySurfaceProps);
}

function openLastStepTaskDetail(taskId: string | null): void {
  if (!taskId) {
    notify.info("No last item");
    return;
  }

  useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, {
    taskId,
  } satisfies TaskDetailSurfaceProps);
}

// Footer — Pattern A (relative-mode scroll hide): slides down + fades out as the
// list scrolls, driven by the --scroll-hide-progress CSS var from useScrollHide().
// See architecture/36_scroll_visibility.md.
const FOOTER_STYLE: React.CSSProperties = {
  transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
};

function WorkerStatsCardSkeleton(): React.JSX.Element {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl bg-card shadow-sm">
      <div className="flex items-center gap-4 px-5 pb-7 pt-5 sm:px-6 sm:pt-6">
        <div className="skeleton-shimmer size-16 rounded-full sm:size-20" />
        <div className="skeleton-shimmer h-7 w-40 rounded sm:h-9 sm:w-56" />
        <div className="skeleton-shimmer ml-auto h-8 w-20 rounded-full sm:h-11 sm:w-28" />
      </div>
      <div className="flex items-center justify-between gap-3 px-5 pb-6 sm:px-6">
        <div className="skeleton-shimmer h-6 w-28 rounded sm:h-8 sm:w-36" />
        <div className="skeleton-shimmer h-9 w-28 rounded-full sm:h-12 sm:w-40" />
      </div>
      <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="flex flex-col items-center gap-2 px-2 py-4 sm:py-5" key={index}>
            <div className="skeleton-shimmer h-3 w-14 rounded" />
            <div className="skeleton-shimmer h-6 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkerStatsSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const rawProps = useSurfaceProps<WorkerStatsSlideSurfaceProps>();
  const [range, setRange] = useState<WorkerStatsDateRange>(() => todayRange());
  const roster = useWorkerStatsRoster(range);
  const { hideProgressContainerRef, scrollRef, isHidden } = useScrollHide();
  usePreloadSurface(preloadWorkerStatsGranularitySlideSurface);
  const today = useMemo(() => todayRange().from, []);

  useEffect(() => {
    // This page renders its own in-scroll title; hide the surface header.
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh(): Promise<void> {
    await roster.refetchAll();
  }

  function handleClose(): void {
    header?.requestClose();
  }

  function updateRange(side: "from" | "to", value: string | null): void {
    setRange((current) => {
      const fallback = todayRange();
      if (side === "from") {
        return { from: value ?? fallback.from, to: current.to };
      }
      return { from: current.from, to: value ?? fallback.to };
    });
  }

  function openRangePicker(): void {
    rawProps.surfaceOpeners?.openCalendarRangePicker?.({
      currentFrom: range.from,
      currentTo: range.to,
      initialTarget: "from",
      onFromSelect: (value) => updateRange("from", value),
      onToSelect: (value) => updateRange("to", value),
      fromLabel: dateRangeLabel(range.from, today),
      toLabel: dateRangeLabel(range.to, today),
      quickRangeOptions: WORKER_STATS_QUICK_RANGE_OPTIONS,
    });
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-background"
      data-testid="worker-stats-slide-page"
      ref={hideProgressContainerRef}
    >
      <PullToRefresh
        className="min-h-0 flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={handleRefresh}
      >
        <section
          aria-busy={roster.isPending}
          className="flex flex-col gap-4 px-4 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-4"
          data-testid="worker-stats-list"
        >
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Worker stats
            </h1>
            <button
              aria-label="Select worker stats date range"
              className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm"
              data-testid="worker-stats-range-trigger"
              type="button"
              onClick={openRangePicker}
            >
              <Calendar aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">
                {range.from === range.to
                  ? dateRangeLabel(range.from, today)
                  : `${dateRangeLabel(range.from, today)} – ${dateRangeLabel(range.to, today)}`}
              </span>
            </button>
          </div>
          {roster.isPending ? (
            Array.from({ length: 4 }).map((_, index) => (
              <WorkerStatsCardSkeleton key={index} />
            ))
          ) : roster.isError ? (
            <div className="rounded-2xl bg-card px-5 py-6 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">
                Worker stats could not be loaded.
              </p>
              <button
                className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground"
                type="button"
                onClick={() => {
                  void roster.refetchAll();
                }}
              >
                Try again
              </button>
            </div>
          ) : roster.workers.length === 0 ? (
            <div className="rounded-2xl bg-card px-5 py-6 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">No workers yet.</p>
            </div>
          ) : (
            roster.workers.map((worker) => (
              <WorkerStatsCard
                key={worker.userId}
                worker={worker}
                onOpenInsights={(insights) =>
                  useSurfaceStore.getState().open(
                    WORKER_STATS_INSIGHTS_SHEET_SURFACE_ID,
                    {
                      insights,
                      workerName: worker.username,
                      profilePicture: worker.profilePicture,
                    } satisfies WorkerStatsInsightsSheetProps,
                  )
                }
                onOpenSection={(intention) =>
                  openGranularitySlide(worker, intention, range)
                }
                onOpenTaskDetail={openLastStepTaskDetail}
              />
            ))
          )}
        </section>
      </PullToRefresh>

      {/* Footer — Pattern A: slides down to hide on scroll (relative mode) */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 will-change-transform"
        style={{ ...FOOTER_STYLE, pointerEvents: isHidden ? "none" : undefined }}
      >
        <div className="border-t border-border bg-background px-4 py-3.5">
          <button
            className="w-full rounded-2xl border border-between-border bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm"
            type="button"
            onClick={handleClose}
          >
            Close &amp; Back
          </button>
        </div>
        <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
      </div>
    </div>
  );
}
