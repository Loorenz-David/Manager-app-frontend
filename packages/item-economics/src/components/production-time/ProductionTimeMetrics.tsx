import { cn } from "@beyo/lib";

import type { ProductionTimeRowMetricsViewModel } from "../../lib/production-time-view-model";
import {
  PRODUCTION_TIME_DANGER_TEXT,
  PRODUCTION_TIME_SUCCESS_TEXT,
} from "./production-time-tone";

export type ProductionTimeMetricsProps = {
  metrics: ProductionTimeRowMetricsViewModel;
  /** The row's accumulated time, placed between budget and variance. */
  workedLabel?: string;
  isMuted?: boolean;
};

const METRIC_TONE_CLASS = {
  neutral: "text-foreground",
  success: PRODUCTION_TIME_SUCCESS_TEXT,
  danger: PRODUCTION_TIME_DANGER_TEXT,
} as const;

/** Compact mobile-first Budget / Worked / Variance-or-Pressure grid. */
export function ProductionTimeMetrics({
  metrics,
  workedLabel,
  isMuted = false,
}: ProductionTimeMetricsProps): React.JSX.Element {
  // Typical moves to the row headline. The other two served metrics keep their
  // order around the accumulated working time, so Budget remains first.
  const displayedMetrics =
    workedLabel === undefined
      ? metrics
      : [
          metrics[0],
          {
            label: "Worked",
            valueLabel: workedLabel,
            supportingLabel: null,
            tone: "neutral" as const,
          },
          metrics[1],
        ];

  return (
    <div
      className={cn("grid grid-cols-3", isMuted && "opacity-60")}
      data-testid="production-time-row-metrics"
    >
      {displayedMetrics.map((metric, index) => (
        <div
          key={metric.label}
          className={cn(
            "flex min-w-0 flex-col items-center px-2 text-center",
            index > 0 && "border-l border-border",
          )}
          data-testid={`production-time-metric-${metric.label
            .toLowerCase()
            .replace(/\s+/g, "-")}`}
        >
          <span className="text-xs text-muted-foreground">
            {metric.label}
          </span>
          <span
            className={cn(
              "mt-1 text-sm font-medium tabular-nums",
              METRIC_TONE_CLASS[metric.tone],
            )}
          >
            {metric.valueLabel}
          </span>
          {metric.supportingLabel ? (
            <span
              className={cn(
                "mt-0.5 text-xs",
                METRIC_TONE_CLASS[metric.tone],
              )}
            >
              {metric.supportingLabel}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
