import { useEffect, useMemo, useState } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  IMAGE_VIEWER_SURFACE_ID,
  type ImageLinkEntityType,
} from "@beyo/images";
import {
  TASK_DETAIL_SURFACE_ID,
  type TaskDetailSurfaceProps,
} from "@beyo/tasks";
import {
  Avatar,
  PullToRefresh,
  TickingTimer,
  useScrollHide,
  useSurfaceStore,
} from "@beyo/ui";

import { useWorkerDailyStepsQuery } from "../api/use-worker-daily-steps-query";
import { WorkerStatsGranularityCard } from "../components/WorkerStatsGranularityCard";
import { WorkerTotalsSelector } from "../components/WorkerTotalsSelector";
import { STATE_CHIP_CLASS } from "../lib/state-pill-styles";
import {
  toWorkerDailyStepCardViewModel,
  type WorkerDailyStepCardViewModel,
} from "../lib/worker-daily-step-dto";
import type { WorkerStatsGranularitySurfaceProps } from "../surface-ids";
import type { WorkerGranularityIntention } from "../types";

// Footer — Pattern A (relative-mode scroll hide): slides down + fades out as the
// list scrolls, driven by the --scroll-hide-progress CSS var from useScrollHide().
// See architecture/36_scroll_visibility.md.
const FOOTER_STYLE: React.CSSProperties = {
  transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
};

function GranularityCardSkeleton(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="flex overflow-hidden rounded-2xl bg-card shadow-sm"
    >
      <div className="aspect-square w-28 shrink-0 animate-pulse bg-muted" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-4 py-3">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-7 w-28 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function WorkerStatsGranularitySlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const rawProps = useSurfaceProps<WorkerStatsGranularitySurfaceProps>();
  const props: WorkerStatsGranularitySurfaceProps = {
    userId: rawProps.userId ?? "",
    username: rawProps.username ?? "",
    profilePicture: rawProps.profilePicture ?? null,
    stepStateLabel: rawProps.stepStateLabel ?? null,
    stepStateVariant: rawProps.stepStateVariant ?? null,
    ticker: rawProps.ticker ?? null,
    workingDisplay: rawProps.workingDisplay ?? "0h 0m",
    pausedDisplay: rawProps.pausedDisplay ?? "0h 0m",
    completedCount: rawProps.completedCount ?? 0,
    initialIntention: rawProps.initialIntention ?? "working",
  };
  const [intention, setIntention] = useState<WorkerGranularityIntention>(
    props.initialIntention,
  );
  const { hideProgressContainerRef, scrollRef, isHidden } = useScrollHide();

  const { query, loadMore, hasMore, isFetchingMore } = useWorkerDailyStepsQuery(
    {
      userId: props.userId,
      intention,
    },
  );

  const cards = useMemo<WorkerDailyStepCardViewModel[]>(
    () =>
      (query.data?.pages ?? []).flatMap((page) =>
        page.items.map((step) =>
          toWorkerDailyStepCardViewModel(step, intention),
        ),
      ),
    [query.data?.pages, intention],
  );

  useEffect(() => {
    // This page renders its own in-scroll header; hide the surface header.
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stateChipClass = props.stepStateVariant
    ? STATE_CHIP_CLASS[props.stepStateVariant]
    : STATE_CHIP_CLASS.neutral;

  async function handleRefresh(): Promise<void> {
    await query.refetch();
  }

  function handleClose(): void {
    header?.requestClose();
  }

  function handleTapImage(card: WorkerDailyStepCardViewModel): void {
    const firstImage = card.images[0];
    if (!card.itemId || !firstImage) {
      return;
    }

    useSurfaceStore.getState().open(IMAGE_VIEWER_SURFACE_ID, {
      images: card.images,
      initialImageClientId: firstImage.clientId,
      entityType: "item" as ImageLinkEntityType,
      entityClientId: card.itemId,
      mode: "preview-only",
      enableOnDemandImageLoad: true,
    });
  }

  function handleTapCard(taskId: string): void {
    useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, {
      taskId,
    } satisfies TaskDetailSurfaceProps);
  }

  const isInitialLoading = query.isPending;

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-background"
      data-testid="worker-stats-granularity-slide-page"
      ref={hideProgressContainerRef}
    >
      <PullToRefresh
        className="min-h-0 flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={handleRefresh}
      >
        <section className="flex flex-col gap-4 px-4 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-4">
          {/* Worker identity + current state (stacked beside the avatar) */}
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              className="size-14 text-md bg-light-border shadow-sm border-light-border"
              imageSrc={props.profilePicture}
              name={props.username}
            />
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
              <h1 className="min-w-0 max-w-full truncate text-md font-semibold tracking-tight text-foreground">
                {props.username}
              </h1>
              {/* Current worker state — independent of the selected intention */}
              {props.stepStateLabel && props.stepStateVariant ? (
                <div
                  className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${stateChipClass}`}
                  data-testid="worker-granularity-current-state"
                >
                  <span>{props.stepStateLabel}</span>
                  {props.ticker ? (
                    <TickingTimer
                      className="font-mono tabular-nums font-normal"
                      offsetSeconds={props.ticker.offsetSeconds}
                      startedAtIso={props.ticker.startedAtIso}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Worker totals selector */}
          <WorkerTotalsSelector
            active={intention}
            completedCount={props.completedCount}
            pausedDisplay={props.pausedDisplay}
            workingDisplay={props.workingDisplay}
            onSelect={setIntention}
          />

          {/* Granular task-step list */}
          <div
            aria-busy={isInitialLoading}
            className="flex flex-col gap-3"
            data-testid="worker-granularity-list"
          >
            {isInitialLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <GranularityCardSkeleton key={index} />
              ))
            ) : query.isError ? (
              <div className="rounded-2xl bg-card px-5 py-6 text-center shadow-sm">
                <p className="text-sm text-muted-foreground">
                  These records could not be loaded.
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
            ) : cards.length === 0 ? (
              <div className="rounded-2xl bg-card px-5 py-6 text-center shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Nothing here for this view yet.
                </p>
              </div>
            ) : (
              <>
                {cards.map((card) => (
                  <WorkerStatsGranularityCard
                    key={card.stepId}
                    card={card}
                    onTapCard={handleTapCard}
                    onTapImage={handleTapImage}
                  />
                ))}
                {hasMore ? (
                  <button
                    className="mt-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-60"
                    data-testid="worker-granularity-load-more"
                    disabled={isFetchingMore}
                    type="button"
                    onClick={() => {
                      void loadMore();
                    }}
                  >
                    {isFetchingMore ? "Loading…" : "Load more"}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </section>
      </PullToRefresh>

      {/* Footer — Pattern A: slides down to hide on scroll (relative mode) */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 will-change-transform"
        style={{
          ...FOOTER_STYLE,
          pointerEvents: isHidden ? "none" : undefined,
        }}
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
        <div
          aria-hidden="true"
          className="h-(--safe-bottom,0px) bg-background"
        />
      </div>
    </div>
  );
}
