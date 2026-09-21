export function StockReportAssignmentsEmptyState(): React.JSX.Element {
  return (
    <p
      className="px-5 py-10 text-center text-sm font-medium text-muted-foreground"
      data-testid="stock-report-assignments-empty"
    >
      No items selected for this stock need yet.
    </p>
  );
}

export type StockReportDetailErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function StockReportDetailErrorState({
  message,
  onRetry,
}: StockReportDetailErrorStateProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center gap-3 px-5 py-10 text-center"
      data-testid="stock-report-detail-error"
    >
      <p className="text-sm font-medium text-muted-foreground">
        {message ?? "The selected items could not be loaded."}
      </p>
      {onRetry ? (
        <button
          className="rounded-full bg-card px-5 py-2 text-sm font-medium text-foreground shadow-sm"
          data-testid="stock-report-detail-error-retry"
          type="button"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

/**
 * Shown when the stock need disappeared while its page was open — deleted by
 * Scanner or by another user (intention §6.2). The slide is closed by the
 * controller; this is what the user reads on the way out.
 */
export function StockReportMissingNotice(): React.JSX.Element {
  return (
    <p
      className="px-5 py-14 text-center text-sm font-medium text-muted-foreground"
      data-testid="stock-report-missing-notice"
    >
      This stock need no longer exists.
    </p>
  );
}

/**
 * Reflection of the assignment section only.
 *
 * The summary card is not part of it: the stock need itself comes from the
 * board's cache, while the assignments are their own request (intention §8.3),
 * so the card is already on screen while this is showing.
 */
export function StockReportAssignmentListSkeleton(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col"
      data-testid="stock-report-assignments-skeleton"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2.5 pt-4">
        <span className="skeleton-shimmer block h-4 w-28 rounded-md" />
        <span className="skeleton-shimmer block h-3 w-14 rounded-md" />
      </div>

      <div className="flex flex-col gap-2.5 px-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <span
            key={index}
            className="skeleton-shimmer block h-28 w-full rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
