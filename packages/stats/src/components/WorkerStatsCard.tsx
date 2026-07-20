import { memo } from "react";
import { Triangle } from "lucide-react";

import { Avatar, TickingTimer } from "@beyo/ui";

import { secondsToHM } from "../lib/format-duration";
import { STATE_CHIP_CLASS } from "../lib/state-pill-styles";
import type { WorkerStatsCardViewModel } from "../lib/worker-stats-dto";
import type { InsightPolarity, WorkerInsight } from "../types";

// Insight band tones — green (recognize) / amber (attention). Driven by the
// insight's `polarity`, never by the sign of its delta.
const INSIGHT_BAND_CLASS: Record<
  InsightPolarity,
  { band: string; icon: string }
> = {
  positive: {
    band: "bg-[#eaf8ef] text-[#1e7a46]",
    icon: "bg-[#bfe3cc] text-[#1e7a46]",
  },
  negative: {
    band: "bg-[#fdf1dd] text-[#8a5a00]",
    icon: "bg-[#f2d79a] text-[#8a5a00]",
  },
};

export type WorkerStatsCardProps = {
  worker: WorkerStatsCardViewModel;
  onOpenInsights?: (insights: WorkerInsight[]) => void;
  // The whole totals row is ONE tap target opening the worker's timeline
  // calendar (decision 20260719 — replaced the per-column granularity opens).
  onOpenTimeline?: () => void;
  onOpenTaskDetail?: (taskId: string | null) => void;
};

export const WorkerStatsCard = memo(function WorkerStatsCard({
  worker,
  onOpenInsights,
  onOpenTimeline,
  onOpenTaskDetail,
}: WorkerStatsCardProps): React.JSX.Element {
  const step = worker.step.status === "ready" ? worker.step.data : null;
  const timeline =
    worker.timeline.status === "ready" ? worker.timeline.data : null;
  const insights =
    worker.insights.status === "ready" ? worker.insights.data : null;
  const tickerChipClass = step?.stepStateVariant
    ? STATE_CHIP_CLASS[step.stepStateVariant]
    : STATE_CHIP_CLASS.neutral;
  const canTapBody = Boolean(onOpenTaskDetail);

  return (
    <article
      className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm"
      data-testid={`worker-stats-card-${worker.userId}`}
    >
      <div
        className={`flex min-w-0 items-center gap-3 px-4 py-4 ${
          canTapBody ? "cursor-pointer" : "cursor-default"
        }`}
        data-testid={`worker-stats-card-body-${worker.userId}`}
        role={canTapBody ? "button" : undefined}
        tabIndex={canTapBody ? 0 : undefined}
        onClick={() => onOpenTaskDetail?.(step?.taskId ?? null)}
        onKeyDown={(event) => {
          if (!canTapBody) {
            return;
          }

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenTaskDetail?.(step?.taskId ?? null);
          }
        }}
      >
        <Avatar
          className="size-10 text-xs bg-light-border shadow-sm border-light-border"
          imageSrc={worker.profilePicture}
          name={worker.username}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground">
              {worker.username}
            </p>
            {worker.step.status === "loading" ? (
              <span
                aria-label="Loading current step"
                className="skeleton-shimmer h-6 w-24 shrink-0 rounded-full"
                data-testid={`worker-stats-step-skeleton-${worker.userId}`}
              />
            ) : step?.stepStateLabel && step.stepStateVariant ? (
              <div
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tickerChipClass}`}
              >
                <span>{step.stepStateLabel}</span>
                {step.ticker ? (
                  <TickingTimer
                    className="font-mono tabular-nums font-normal"
                    data-testid={`worker-stats-timer-${worker.userId}`}
                    offsetSeconds={step.ticker.offsetSeconds}
                    startedAtIso={step.ticker.startedAtIso}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          {worker.step.status === "loading" ? (
            <span
              aria-label="Loading last interacted step"
              className="skeleton-shimmer mt-2 h-5 w-32 rounded"
              data-testid={`worker-stats-step-row-skeleton-${worker.userId}`}
            />
          ) : step?.hasStep ? (
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-muted-foreground">
                {step.articleLabel ?? "—"}
                {step.workingSectionName ? (
                  <span className="font-normal text-muted-foreground">
                    {` · ${step.workingSectionName}`}
                  </span>
                ) : null}
              </p>
            </div>
          ) : null}
          {step?.pauseReason ? (
            <p
              className="mt-2 min-w-0 border-l-2 border-[#f0c36a] pl-2.5 text-sm italic text-muted-foreground"
              data-testid={`worker-stats-pause-reason-${worker.userId}`}
            >
              {step.pauseReason}
            </p>
          ) : null}
        </div>
      </div>

      {worker.insights.status === "loading" ? (
        <div
          aria-label="Loading worker insight"
          className="skeleton-shimmer mx-4 h-10 rounded-lg"
          data-testid={`worker-stats-insight-skeleton-${worker.userId}`}
        />
      ) : insights?.topInsight ? (
        <button
          aria-label={insights.topInsight.title}
          className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left ${INSIGHT_BAND_CLASS[insights.topInsight.tone].band}`}
          data-testid={`worker-stats-insight-${worker.userId}`}
          type="button"
          onClick={() => onOpenInsights?.(insights.insights)}
        >
          <span
            aria-hidden="true"
            className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full ${INSIGHT_BAND_CLASS[insights.topInsight.tone].icon}`}
          >
            <Triangle
              className={`size-3 fill-current ${insights.topInsight.tone === "negative" ? "rotate-180" : ""}`}
            />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {insights.topInsight.title}
          </span>
          {insights.topInsight.rightValue ? (
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {insights.topInsight.rightValue}
            </span>
          ) : null}
        </button>
      ) : null}

      {/* One row-level tap target: the totals strip opens the worker's
          timeline calendar (per-column granularity opens removed 20260719). */}
      <button
        aria-label={`Open ${worker.username}'s timeline`}
        className={`grid grid-cols-4 divide-x divide-border border-t border-border ${
          timeline && onOpenTimeline ? "cursor-pointer" : "cursor-default"
        }`}
        data-testid={`worker-stats-timeline-row-${worker.userId}`}
        disabled={!timeline || !onOpenTimeline}
        type="button"
        onClick={() => onOpenTimeline?.()}
      >
        <WorkerStat
          label="Worked"
          testId={`worker-stats-working-${worker.userId}`}
          value={renderDurationValue(worker, timeline?.workingSeconds)}
        />
        <WorkerStat
          label="Paused"
          testId={`worker-stats-paused-${worker.userId}`}
          value={renderDurationValue(worker, timeline?.pausedSeconds)}
        />
        <WorkerStat
          label="Idle"
          testId={`worker-stats-idle-${worker.userId}`}
          value={renderDurationValue(worker, timeline?.idleSeconds)}
        />
        <WorkerStat
          label="Completed"
          testId={`worker-stats-completed-${worker.userId}`}
          value={
            worker.timeline.status === "loading" ? (
              <span
                aria-hidden="true"
                className="skeleton-shimmer inline-block h-5 w-10 rounded"
              />
            ) : timeline ? (
              String(timeline.completedCount)
            ) : (
              "—"
            )
          }
        />
      </button>
    </article>
  );
});

// Settled wall-clock duration from /linear-timeline — no live ticking.
function renderDurationValue(
  worker: WorkerStatsCardViewModel,
  seconds: number | undefined,
): React.ReactNode {
  if (worker.timeline.status === "loading") {
    return (
      <span
        aria-hidden="true"
        className="skeleton-shimmer inline-block h-5 w-14 rounded"
      />
    );
  }

  if (seconds === undefined) {
    return "—";
  }

  return <span className="tabular-nums">{secondsToHM(seconds)}</span>;
}

// Display-only cell — interaction lives on the row-level button above.
function WorkerStat({
  label,
  testId,
  value,
}: {
  label: string;
  testId: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      className="flex min-w-0 flex-col items-center px-2 py-3 text-center"
      data-testid={`${testId}-section`}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <strong
        className="mt-1 text-sm font-semibold tracking-tight text-foreground"
        data-testid={testId}
      >
        {value}
      </strong>
    </div>
  );
}
