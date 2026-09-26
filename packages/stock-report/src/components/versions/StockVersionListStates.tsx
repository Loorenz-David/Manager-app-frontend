export function StockVersionListSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2.5" data-testid="stock-version-list-skeleton">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
    </div>
  );
}

export function StockVersionListEmptyState(): React.JSX.Element {
  return (
    <p
      className="px-5 py-12 text-center text-sm font-medium text-muted-foreground"
      data-testid="stock-version-list-empty"
    >
      No versions yet. Open the first one from the stock report.
    </p>
  );
}

export type StockVersionListErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function StockVersionListErrorState({
  message,
  onRetry,
}: StockVersionListErrorStateProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center gap-3 px-5 py-12 text-center"
      data-testid="stock-version-list-error"
    >
      <p className="text-sm font-medium text-muted-foreground">
        {message ?? "Version history could not be loaded."}
      </p>
      {onRetry ? (
        <button
          className="rounded-full bg-card px-5 py-2 text-sm font-medium text-foreground shadow-sm"
          data-testid="stock-version-list-error-retry"
          type="button"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
