import { memo } from "react";
import { Triangle } from "lucide-react";

import { Avatar, TickingTimer } from "@beyo/ui";

import { secondsToHM } from "../lib/format-duration";
import { STATE_CHIP_CLASS } from "../lib/state-pill-styles";
import type {
  LiveTotal,
  WorkerStatsCardViewModel,
} from "../lib/worker-stats-dto";
import { WorkerTotalTicker } from "./WorkerTotalTicker";
import type {
  InsightPolarity,
  WorkerGranularityIntention,
  WorkerInsight,
} from "../types";

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
  onOpenSection?: (intention: WorkerGranularityIntention) => void;
  onOpenTaskDetail?: (taskId: string | null) => void;
};

export const WorkerStatsCard = memo(function WorkerStatsCard({
  worker,
  onOpenInsights,
  onOpenSection,
  onOpenTaskDetail,
}: WorkerStatsCardProps): React.JSX.Element {
  const tickerChipClass = worker.stepStateVariant
    ? STATE_CHIP_CLASS[worker.stepStateVariant]
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
        onClick={() => onOpenTaskDetail?.(worker.taskId)}
        onKeyDown={(event) => {
          if (!canTapBody) {
            return;
          }

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenTaskDetail?.(worker.taskId);
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
            {worker.stepStateLabel && worker.stepStateVariant ? (
              <div
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tickerChipClass}`}
              >
                <span>{worker.stepStateLabel}</span>
                {worker.ticker ? (
                  <TickingTimer
                    className="font-mono tabular-nums font-normal"
                    data-testid={`worker-stats-timer-${worker.userId}`}
                    offsetSeconds={worker.ticker.offsetSeconds}
                    startedAtIso={worker.ticker.startedAtIso}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          {worker.hasStep ? (
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-muted-foreground">
                {worker.articleLabel ?? "—"}
                {worker.workingSectionName ? (
                  <span className="font-normal text-muted-foreground">
                    {` · ${worker.workingSectionName}`}
                  </span>
                ) : null}
              </p>
            </div>
          ) : null}
          {worker.pauseReason ? (
            <p
              className="mt-2 min-w-0 border-l-2 border-[#f0c36a] pl-2.5 text-sm italic text-muted-foreground"
              data-testid={`worker-stats-pause-reason-${worker.userId}`}
            >
              {worker.pauseReason}
            </p>
          ) : null}
        </div>
      </div>

      {worker.topInsight ? (
        <button
          aria-label={worker.topInsight.title}
          className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left ${INSIGHT_BAND_CLASS[worker.topInsight.tone].band}`}
          data-testid={`worker-stats-insight-${worker.userId}`}
          type="button"
          onClick={() => onOpenInsights?.(worker.insights)}
        >
          <span
            aria-hidden="true"
            className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full ${INSIGHT_BAND_CLASS[worker.topInsight.tone].icon}`}
          >
            <Triangle
              className={`size-3 fill-current ${worker.topInsight.tone === "negative" ? "rotate-180" : ""}`}
            />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {worker.topInsight.title}
          </span>
          {worker.topInsight.rightValue ? (
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {worker.topInsight.rightValue}
            </span>
          ) : null}
        </button>
      ) : null}

      <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
        <WorkerStat
          intention="working"
          label="Working"
          testId={`worker-stats-working-${worker.userId}`}
          value={
            <LiveTotalValue
              testId={`worker-stats-working-${worker.userId}`}
              total={worker.workingTotal}
            />
          }
          onOpenSection={onOpenSection}
        />
        <WorkerStat
          intention="paused"
          label="Paused"
          testId={`worker-stats-paused-${worker.userId}`}
          value={
            <LiveTotalValue
              testId={`worker-stats-paused-${worker.userId}`}
              total={worker.pausedTotal}
            />
          }
          onOpenSection={onOpenSection}
        />
        <WorkerStat
          intention="completed"
          label="Completed"
          testId={`worker-stats-completed-${worker.userId}`}
          value={String(worker.completedCount)}
          onOpenSection={onOpenSection}
        />
      </div>
    </article>
  );
});

// Ticks off the shared clock when intervals are open in that state; otherwise
// renders a plain settled total.
function LiveTotalValue({
  total,
  testId,
}: {
  total: LiveTotal;
  testId: string;
}): React.JSX.Element {
  if (total.kind === "ticking") {
    return (
      <WorkerTotalTicker
        asOfIso={total.asOfIso}
        className="tabular-nums"
        data-testid={`${testId}-timer`}
        offsetSeconds={total.offsetSeconds}
        ratePerSecond={total.ratePerSecond}
      />
    );
  }

  return <span className="tabular-nums">{secondsToHM(total.seconds)}</span>;
}

function WorkerStat({
  intention,
  label,
  testId,
  value,
  onOpenSection,
}: {
  intention: WorkerGranularityIntention;
  label: string;
  testId: string;
  value: React.ReactNode;
  onOpenSection?: (intention: WorkerGranularityIntention) => void;
}): React.JSX.Element {
  const isInteractive = Boolean(onOpenSection);

  return (
    <button
      className={`flex min-w-0 flex-col items-center px-2 py-3 text-center ${
        isInteractive ? "cursor-pointer" : "cursor-default"
      }`}
      data-testid={`${testId}-section`}
      disabled={!isInteractive}
      type="button"
      onClick={() => onOpenSection?.(intention)}
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
    </button>
  );
}
