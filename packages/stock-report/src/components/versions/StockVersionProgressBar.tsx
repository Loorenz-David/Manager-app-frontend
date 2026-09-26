import { cn } from "@beyo/lib";

import { computeFulfilmentSegments } from "../../lib/fulfilment-bar";
import { BAR_TRACK_CLASS, SEGMENT_FILL_CLASS } from "../../lib/stock-report-theme";
import type { StockReportVersionGroupProgress } from "../../stock-report.types";

export type StockVersionProgressBarProps = {
  progress: StockReportVersionGroupProgress;
  className?: string;
  "data-testid"?: string;
};

const SEGMENTS = [
  { key: "fulfilled", suffix: "fulfilled" },
  { key: "inProgress", suffix: "in-progress" },
  { key: "inQueue", suffix: "in-queue" },
  { key: "missing", suffix: "missing" },
] as const;

/**
 * A version group's bar, thin and without numerals, drawn with the stock-need
 * card's own segments and colours (`computeFulfilmentSegments`): done →
 * in progress → in queue → missing → open. The count beside it stays
 * `quantity_completed / quantity_target` (§6.8); the bar exists so work that
 * is under way or queued is visible before anything is completed (owner,
 * 2026-09-26). `data-percent` carries the completed share for tests, `none`
 * when the group has no snapshot — an empty track, which is a state, not 0 %.
 */
export function StockVersionProgressBar({
  progress,
  className,
  "data-testid": testId,
}: StockVersionProgressBarProps): React.JSX.Element {
  const segments = computeFulfilmentSegments(progress.quantities);
  const percent = progress.percent ?? 0;
  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={progress.percent === null ? undefined : Math.round(percent)}
      className={cn("flex h-2 w-full overflow-hidden rounded-full", BAR_TRACK_CLASS, className)}
      data-percent={progress.percent === null ? "none" : String(Math.round(percent))}
      data-testid={testId}
      role="progressbar"
    >
      {SEGMENTS.map(({ key, suffix }) => {
        const segment = segments[key];
        return segment ? (
          <span
            key={key}
            className={cn("h-full shrink-0 grow-0", SEGMENT_FILL_CLASS[key])}
            data-testid={testId ? `${testId}-${suffix}` : undefined}
            data-value={segment.value}
            style={{ width: `${segment.widthPercent}%` }}
          />
        ) : null;
      })}
    </div>
  );
}
