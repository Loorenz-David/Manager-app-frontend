import { ChevronRight, ClipboardList } from "lucide-react";

type StockReportHubViewProps = {
  onOpenBoard: () => void;
};

/**
 * The manager's stock report landing pane. Each row opens one stock-report
 * capability; the stock needs board is the first. Workers and sellers never
 * see this — their tab is the board itself.
 */
export function StockReportHubView({
  onOpenBoard,
}: StockReportHubViewProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2 px-4 pt-4.5" data-testid="stock-report-hub">
      <button
        className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left"
        data-testid="stock-report-hub-open-board"
        type="button"
        onClick={onOpenBoard}
      >
        <div className="flex min-w-0 items-center gap-3">
          <ClipboardList aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Stock needs</p>
            <p className="text-sm text-muted-foreground">
              View and reorganise stock report rows
            </p>
          </div>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </button>
    </div>
  );
}
