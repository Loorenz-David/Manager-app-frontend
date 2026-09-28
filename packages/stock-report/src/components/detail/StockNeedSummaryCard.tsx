import { Info } from "lucide-react";

import { FulfilmentBar } from "../board/FulfilmentBar";
import { StockNeedHeadline } from "../board/StockNeedHeadline";
import { StockNeedQuantityPanel } from "../board/StockNeedQuantityPanel";
import type {
  FulfilmentQuantities,
  StockReportMissingSource,
  StockReportRequestedSource,
} from "../../stock-report.types";

export type StockNeedSummaryCardProps = {
  /** The category name: the headline's eyebrow and the picture's alternative text. */
  title: string;
  imageUrl: string | null;
  /** The criteria line; `null` puts the category name in its place. */
  propertyHeadline: string | null;
  quantities: FulfilmentQuantities;
  /** Opens the bar's legend sheet; without it the card shows no legend control. */
  onOpenLegend?: () => void;
  /** Which requested value is in force (v8 §6.6); a manual one names Scanner's beside it. */
  requestedSource?: StockReportRequestedSource;
  /** What Scanner says (a draft) or said when it froze (active). */
  requestedScanner?: number;
  /** Where a draft row's missing count comes from (v9 §6.6); ignored on the board. */
  missingSource?: StockReportMissingSource;
  /** The same row's missing count on the live version; `null` when it has none there. */
  activeMissing?: number | null;
  /** Whether the page shows a draft's row — the missing-source line is a draft's only. */
  isDraft?: boolean;
};

/**
 * The line under the missing count on a draft (v9 §0.1 item 10): where the
 * count comes from, and — under a typed value — what the board says.
 */
export function missingSourceLine(
  missingSource: StockReportMissingSource,
  activeMissing: number | null,
): string | null {
  if (missingSource === "active") return "missing on the live version";
  if (missingSource === "own") {
    return activeMissing === null ? "missing in this draft" : `missing in this draft · board says ${activeMissing}`;
  }
  return null;
}

/**
 * The detail page's header card: the list card's anatomy promoted to summary
 * scale — 82 px quantity panel, the same headline, a taller bar — and, right-aligned under
 * the bar in its own column, a small control that opens the legend as a sheet
 * (owner, 2026-09-26). The legend used to sit here inline; it wrapped beside
 * the panel, and the sheet can show the bar above its rows instead.
 *
 * The headline block is the list card's own, eyebrow included (owner,
 * 2026-09-28), so a row reads the same on the board and here even though the
 * slide surface's header also names the category (intention §6.2).
 */
export function StockNeedSummaryCard({
  title,
  imageUrl,
  propertyHeadline,
  quantities,
  onOpenLegend,
  requestedSource = "scanner",
  requestedScanner,
  missingSource = "own",
  activeMissing = null,
  isDraft = false,
}: StockNeedSummaryCardProps): React.JSX.Element {
  const requestedLine =
    requestedSource === "manual" ? `requested by hand · Scanner says ${requestedScanner ?? quantities.requested}` : null;
  const missingLine = isDraft ? missingSourceLine(missingSource, activeMissing) : null;

  return (
    <div
      // 1.125rem is the design's 18px summary radius, one step above the 16px
      // list card; no radius token sits between rounded-2xl and rounded-3xl.
      className="flex overflow-hidden rounded-[1.125rem] border border-border bg-card shadow-sm"
      data-testid="stock-report-summary-card"
    >
      <StockNeedQuantityPanel
        data-testid="stock-report-summary-panel"
        imageAlt={title}
        imageUrl={imageUrl}
        quantity={quantities.requested}
        size="card"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2.5 pr-4 py-4">
        <StockNeedHeadline
          category={title}
          data-testid="stock-report-summary-headline"
          headline={propertyHeadline}
        />
        <FulfilmentBar
          data-testid="stock-report-summary-bar"
          quantities={quantities}
          size="summary"
        />
        {requestedLine || missingLine ? (
          <div className="flex flex-col gap-0.5 text-[11px] leading-snug text-muted-foreground">
            {requestedLine ? <p data-testid="stock-report-summary-requested-source">{requestedLine}</p> : null}
            {missingLine ? <p data-testid="stock-report-summary-missing-source">{`${quantities.missing} ${missingLine}`}</p> : null}
          </div>
        ) : null}
        {onOpenLegend ? (
          <div className="flex justify-end">
            <button
              className="flex min-h-8 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold tracking-wide text-muted-foreground hover:bg-muted"
              data-testid="stock-report-summary-legend-button"
              type="button"
              onClick={onOpenLegend}
            >
              <Info aria-hidden="true" className="size-3.5 shrink-0" />
              Legend
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
