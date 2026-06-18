type EmptyProps = {
  hasSearch: boolean;
  mode: "needs" | "orders";
};

export function OrderingEmptyState({
  hasSearch,
  mode,
}: EmptyProps): React.JSX.Element {
  const label = hasSearch
    ? "No matching upholstery records."
    : mode === "needs"
      ? "No upholstery needs ordering."
      : "No active upholstery orders.";
  return (
    <div className="flex min-h-[18rem] items-center justify-center px-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function OrderingErrorState({
  onRetry,
}: {
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 px-8 text-center">
      <p className="text-sm text-muted-foreground">Could not load upholstery ordering data.</p>
      <button
        className="rounded-full bg-card px-5 py-2 text-sm font-medium text-foreground shadow-sm"
        type="button"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}

export function OrderingSkeleton(): React.JSX.Element {
  return (
    <div className="mx-4 flex overflow-hidden rounded-xl bg-card shadow-sm">
      <div className="aspect-square w-28 shrink-0 animate-pulse bg-muted" />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-auto h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
