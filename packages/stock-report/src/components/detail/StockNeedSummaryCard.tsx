import { FulfilmentBar } from "../board/FulfilmentBar";
import { FulfilmentLegend } from "../board/FulfilmentLegend";
import { StockNeedPropertyTags } from "../board/StockNeedPropertyTags";
import { StockNeedQuantityPanel } from "../board/StockNeedQuantityPanel";
import type { FulfilmentQuantities } from "../../stock-report.types";

export type StockNeedSummaryCardProps = {
  /** Used as the picture's alternative text; never rendered as a title. */
  title: string;
  imageUrl: string | null;
  propertyTags: readonly string[];
  quantities: FulfilmentQuantities;
};

/**
 * The detail page's header card: the list card's anatomy promoted to summary
 * scale — 82 px quantity panel, tags, a taller bar, and the legend.
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
        <FulfilmentLegend />
      </div>
    </div>
  );
}
