import { cn } from "@beyo/lib";

import type { ProductionTimeRowMetricsViewModel } from "../../lib/production-time-view-model";
import {
  PRODUCTION_TIME_DANGER_TEXT,
  PRODUCTION_TIME_SUCCESS_TEXT,
} from "./production-time-tone";

export type ProductionTimeMetricsProps = {
  metrics: ProductionTimeRowMetricsViewModel;
  isMuted?: boolean;
};

const METRIC_TONE_CLASS = {
  neutral: "text-foreground",
  success: PRODUCTION_TIME_SUCCESS_TEXT,
  danger: PRODUCTION_TIME_DANGER_TEXT,
} as const;

/** Compact mobile-first Budget / Variance-or-Pressure / Typical grid. */
export function ProductionTimeMetrics({
  metrics,
  isMuted = false,
}: ProductionTimeMetricsProps): React.JSX.Element {
  return (
    <div
      className={cn("grid grid-cols-3", isMuted && "opacity-60")}
      data-testid="production-time-row-metrics"
    >
      {metrics.map((metric, index) => (
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
            {metric.labelSuffix ? (
              // Dimmer than the name it qualifies: it is a unit, not a second
              // metric competing for the same glance.
              <span className="ml-0.5 opacity-70">{metric.labelSuffix}</span>
            ) : null}
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
