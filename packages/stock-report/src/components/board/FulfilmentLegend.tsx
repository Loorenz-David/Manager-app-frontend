import { cn } from "@beyo/lib";

import { LEGEND_SWATCH_CLASS } from "../../lib/stock-report-theme";

const ENTRIES = [
  { key: "fulfilled", label: "Fulfilled" },
  { key: "inProgress", label: "In progress" },
  { key: "inQueue", label: "In queue" },
] as const;

export type FulfilmentLegendProps = {
  className?: string;
};

/**
 * Names the bar's four colours once, on the screen where the bar is the
 * primary data display. List cards deliberately go without it.
 */
export function FulfilmentLegend({
  className,
}: FulfilmentLegendProps): React.JSX.Element {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-3", className)}
      data-testid="stock-report-fulfilment-legend"
    >
      {ENTRIES.map((entry) => (
        <span
          key={entry.key}
          className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2 shrink-0 rounded-[2px]",
              LEGEND_SWATCH_CLASS[entry.key],
            )}
          />
          {entry.label}
        </span>
      ))}
    </div>
  );
}
