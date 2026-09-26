import type { StockReportMissingSummary } from "@beyo/stock-report";
import { ChevronRight, TriangleAlert } from "lucide-react";

type StockMissingRowProps = {
  summary: StockReportMissingSummary;
  onPress: () => void;
};

/**
 * The buyer's warning: how much stock cannot be covered and must be found.
 * Amber — the app's `StatePill` warning trio — because it is the one row on
 * this pane that asks the manager to act outside the workshop. The hub renders
 * it only while the total is above zero (owner, 2026-09-26).
 */
export function StockMissingRow({ summary, onPress }: StockMissingRowProps): React.JSX.Element {
  const items = summary.items_with_missing;
  return (
    <button
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-[#f0c36a] bg-[#fff4d6] px-4 py-3 text-left text-warning"
      data-testid="stock-report-hub-open-missing"
      type="button"
      onClick={onPress}
    >
      <div className="flex min-w-0 items-center gap-3">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold" data-testid="stock-report-hub-missing-total">
            {summary.quantity_missing_total} missing
          </p>
          <p className="text-sm opacity-80">
            {`across ${items} stock ${items === 1 ? "need" : "needs"}`}
          </p>
        </div>
      </div>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
    </button>
  );
}
