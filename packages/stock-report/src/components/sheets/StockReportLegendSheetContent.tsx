import { cn } from "@beyo/lib";

import { computeFulfilmentSegments } from "../../lib/fulfilment-bar";
import { LEGEND_SWATCH_CLASS } from "../../lib/stock-report-theme";
import type { FulfilmentQuantities } from "../../stock-report.types";
import { FulfilmentBar } from "../board/FulfilmentBar";

export type StockReportLegendSheetContentProps = {
  quantities: FulfilmentQuantities;
};

const ROWS = [
  { key: "fulfilled", label: "Fulfilled", testId: "fulfilled" },
  { key: "inProgress", label: "In progress", testId: "in-progress" },
  { key: "inQueue", label: "In queue", testId: "in-queue" },
  { key: "missing", label: "Missing", testId: "missing" },
  { key: "remaining", label: "Remaining", testId: "remaining" },
] as const;

/**
 * The fulfilment bar's legend as its own sheet (owner, 2026-09-26): the bar
 * itself on top, then one row per colour with its label and the number that
 * segment carries, so the reader can match each swatch to the bar above it.
 * Every row renders, zero included — the sheet explains the colours, it does
 * not summarise the row. `remaining` is the bar's own arithmetic, so the
 * sheet can never disagree with the bar it explains.
 */
export function StockReportLegendSheetContent({
  quantities,
}: StockReportLegendSheetContentProps): React.JSX.Element {
  const segments = computeFulfilmentSegments(quantities);
  const values: Record<(typeof ROWS)[number]["key"], number> = {
    fulfilled: Math.max(0, quantities.fulfilled),
    inProgress: Math.max(0, quantities.inProgress),
    inQueue: Math.max(0, quantities.inQueue),
    missing: Math.max(0, quantities.missing),
    remaining: segments.remaining?.value ?? 0,
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-4" data-testid="stock-report-legend-sheet">
      {/* A border on the track: on the sheet's muted background the bare
          grey track vanishes, and on the card it never needed one. */}
      <FulfilmentBar
        className="border border-border"
        data-testid="stock-report-legend-bar"
        quantities={quantities}
        size="summary"
      />

      <ul className="flex flex-col gap-2">
        {ROWS.map((row) => (
          <li
            key={row.key}
            className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5"
            data-testid={`stock-report-legend-${row.testId}`}
          >
            <span
              aria-hidden="true"
              className={cn("size-3 shrink-0 rounded-[3px]", LEGEND_SWATCH_CLASS[row.key])}
            />
            <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{row.label}</span>
            <span
              className="text-sm font-semibold tabular-nums text-muted-foreground"
              data-testid={`stock-report-legend-${row.testId}-value`}
            >
              {values[row.key]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
