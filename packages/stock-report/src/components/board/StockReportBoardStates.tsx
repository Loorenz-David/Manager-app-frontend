import { StockNeedCardSkeleton } from "./StockNeedCardSkeleton";

export function StockReportBoardEmptyState(): React.JSX.Element {
  return (
    <p
      className="px-5 py-12 text-center text-sm font-medium text-muted-foreground"
      data-testid="stock-report-empty"
    >
      No stock need matches these filters.
    </p>
  );
}

export type StockReportBoardErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function StockReportBoardErrorState({
  message,
  onRetry,
}: StockReportBoardErrorStateProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center gap-3 px-5 py-12 text-center"
      data-testid="stock-report-error"
    >
      <p className="text-sm font-medium text-muted-foreground">
        {message ?? "Stock needs could not be loaded."}
      </p>
      {onRetry ? (
        <button
          className="rounded-full bg-card px-5 py-2 text-sm font-medium text-foreground shadow-sm"
          data-testid="stock-report-error-retry"
          type="button"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function StockReportBoardSkeleton(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-2.5"
      data-testid="stock-report-board-skeleton"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <StockNeedCardSkeleton key={index} />
      ))}
    </div>
  );
}
