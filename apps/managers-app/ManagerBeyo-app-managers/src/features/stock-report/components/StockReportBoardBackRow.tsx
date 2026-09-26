import { ChevronLeft } from "lucide-react";

type StockReportBoardBackRowProps = {
  onBack: () => void;
};

/**
 * Manager-only row above the shared board: the board view itself is rendered
 * by every app, so the way back to the hub lives here, outside it.
 */
export function StockReportBoardBackRow({
  onBack,
}: StockReportBoardBackRowProps): React.JSX.Element {
  return (
    <div className="flex shrink-0 items-center px-2 pt-3">
      <button
        aria-label="Back to stock report"
        className="flex h-9 items-center gap-1 rounded-full pl-1 pr-3 text-foreground"
        data-testid="stock-report-board-back"
        type="button"
        onClick={onBack}
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
        <span className="text-sm font-medium">Stock report</span>
      </button>
    </div>
  );
}
