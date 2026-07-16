import { useEffect, useMemo } from "react";

import { usePreloadSurface, useSurfaceHeader } from "@beyo/hooks";
import { notify } from "@beyo/lib";
import {
  TASK_DETAIL_SURFACE_ID,
  type TaskDetailSurfaceProps,
} from "@beyo/tasks";
import { PullToRefresh, useScrollHide, useSurfaceStore } from "@beyo/ui";

import { useWorkerStatsQuery } from "../api/use-worker-stats-query";
import { WorkerStatsCard } from "../components/WorkerStatsCard";
import {
  liveTotalToText,
  toWorkerStatsCardViewModel,
  type WorkerStatsCardViewModel,
} from "../lib/worker-stats-dto";
import {
  preloadWorkerStatsGranularitySlideSurface,
  WORKER_STATS_GRANULARITY_SLIDE_SURFACE_ID,
  WORKER_STATS_INSIGHTS_SHEET_SURFACE_ID,
  type WorkerStatsGranularitySurfaceProps,
  type WorkerStatsInsightsSheetProps,
} from "../surface-ids";
import type { WorkerGranularityIntention } from "../types";

function openGranularitySlide(
  worker: WorkerStatsCardViewModel,
  intention: WorkerGranularityIntention,
): void {
  useSurfaceStore.getState().open(WORKER_STATS_GRANULARITY_SLIDE_SURFACE_ID, {
    userId: worker.userId,
    username: worker.username,
    profilePicture: worker.profilePicture,
    stepStateLabel: worker.stepStateLabel,
    stepStateVariant: worker.stepStateVariant,
    ticker: worker.ticker,
    workingDisplay: liveTotalToText(worker.workingTotal),
    pausedDisplay: liveTotalToText(worker.pausedTotal),
    completedCount: worker.completedCount,
    initialIntention: intention,
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

const PAGE_LIMIT = 50;

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
        <div className="size-16 animate-pulse rounded-full bg-muted sm:size-20" />
        <div className="h-7 w-40 animate-pulse rounded bg-muted sm:h-9 sm:w-56" />
        <div className="ml-auto h-8 w-20 animate-pulse rounded-full bg-muted sm:h-11 sm:w-28" />
      </div>
      <div className="flex items-center justify-between gap-3 px-5 pb-6 sm:px-6">
        <div className="h-6 w-28 animate-pulse rounded bg-muted sm:h-8 sm:w-36" />
        <div className="h-9 w-28 animate-pulse rounded-full bg-muted sm:h-12 sm:w-40" />
      </div>
      <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="flex flex-col items-center gap-2 px-2 py-4 sm:py-5" key={index}>
            <div className="h-3 w-14 animate-pulse rounded bg-muted" />
            <div className="h-6 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkerStatsSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const query = useWorkerStatsQuery({ limit: PAGE_LIMIT, offset: 0 });
  const { hideProgressContainerRef, scrollRef, isHidden } = useScrollHide();
  usePreloadSurface(preloadWorkerStatsGranularitySlideSurface);
  const workers = useMemo(
    () => (query.data?.workers ?? []).map(toWorkerStatsCardViewModel),
    [query.data?.workers],
  );

  useEffect(() => {
    // This page renders its own in-scroll title; hide the surface header.
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh(): Promise<void> {
    await query.refetch();
  }

  function handleClose(): void {
    header?.requestClose();
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
          aria-busy={query.isPending}
          className="flex flex-col gap-4 px-4 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-4"
          data-testid="worker-stats-list"
        >
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Worker stats
          </h1>
          {query.isPending ? (
            Array.from({ length: 4 }).map((_, index) => (
              <WorkerStatsCardSkeleton key={index} />
            ))
          ) : query.isError ? (
            <div className="rounded-2xl bg-card px-5 py-6 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">
                Worker stats could not be loaded.
              </p>
              <button
                className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground"
                type="button"
                onClick={() => {
                  void query.refetch();
                }}
              >
                Try again
              </button>
            </div>
          ) : workers.length === 0 ? (
            <div className="rounded-2xl bg-card px-5 py-6 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">No workers yet.</p>
            </div>
          ) : (
            workers.map((worker) => (
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
                  openGranularitySlide(worker, intention)
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
