import { Info } from "lucide-react";

import { FulfilmentBar } from "../board/FulfilmentBar";
import { StockNeedPropertyTags } from "../board/StockNeedPropertyTags";
import { StockNeedQuantityPanel } from "../board/StockNeedQuantityPanel";
import type { FulfilmentQuantities } from "../../stock-report.types";

export type StockNeedSummaryCardProps = {
  /** Used as the picture's alternative text; never rendered as a title. */
  title: string;
  imageUrl: string | null;
  propertyTags: readonly string[];
  quantities: FulfilmentQuantities;
  /** Opens the bar's legend sheet; without it the card shows no legend control. */
  onOpenLegend?: () => void;
};

/**
 * The detail page's header card: the list card's anatomy promoted to summary
 * scale — 82 px quantity panel, tags, a taller bar — and, right-aligned under
 * the bar in its own column, a small control that opens the legend as a sheet
 * (owner, 2026-09-26). The legend used to sit here inline; it wrapped beside
 * the panel, and the sheet can show the bar above its rows instead.
 *
 * It deliberately does **not** repeat the category name: the slide surface's
 * own header carries it (intention §6.2), which is also why this page has no
 * back-arrow bar of its own.
 */
export function StockNeedSummaryCard({
  title,
  imageUrl,
  propertyTags,
  quantities,
  onOpenLegend,
}: StockNeedSummaryCardProps): React.JSX.Element {
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
        <StockNeedPropertyTags
          data-testid="stock-report-summary-tags"
          tags={propertyTags}
        />
        <FulfilmentBar
          data-testid="stock-report-summary-bar"
          quantities={quantities}
          size="summary"
        />
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
