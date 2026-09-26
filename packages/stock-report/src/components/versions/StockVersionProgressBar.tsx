import { cn } from "@beyo/lib";

import { BAR_TRACK_CLASS, SEGMENT_FILL_CLASS } from "../../lib/stock-report-theme";
import type { StockReportVersionGroupProgress } from "../../stock-report.types";

export type StockVersionProgressBarProps = {
  progress: StockReportVersionGroupProgress;
  className?: string;
  "data-testid"?: string;
};

/**
 * `quantity_completed / quantity_target` as one green fill (§6.8) — the same
 * green the fulfilment bar uses for done units, so the hub card and the
 * history list mean the same thing by the same colour. A zero target renders
 * an empty track: nothing has been prioritised yet, which is a state, not 0 %.
 */
export function StockVersionProgressBar({
  progress,
  className,
  "data-testid": testId,
}: StockVersionProgressBarProps): React.JSX.Element {
  const percent = progress.percent ?? 0;
  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={progress.percent === null ? undefined : Math.round(percent)}
      className={cn("h-2 w-full overflow-hidden rounded-full", BAR_TRACK_CLASS, className)}
      data-percent={progress.percent === null ? "none" : String(Math.round(percent))}
      data-testid={testId}
      role="progressbar"
    >
      <div
        className={cn("h-full rounded-full", SEGMENT_FILL_CLASS.fulfilled)}
        data-testid={testId ? `${testId}-fill` : undefined}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
