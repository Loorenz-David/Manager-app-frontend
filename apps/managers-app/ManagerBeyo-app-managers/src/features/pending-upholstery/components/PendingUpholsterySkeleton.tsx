export function PendingUpholsterySkeleton(): React.JSX.Element {
  return (
    <div className="mx-4 h-36 overflow-hidden rounded-xl bg-card shadow-sm">
      <div className="flex h-28 animate-pulse">
        <div className="h-28 w-28 shrink-0 bg-muted" />
        <div className="flex flex-1 flex-col gap-3 px-3 py-3">
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
          <div className="h-3 w-1/3 rounded bg-muted" />
        </div>
      </div>
      <div className="h-8 animate-pulse border-t border-border bg-muted/60" />
    </div>
  );
}
