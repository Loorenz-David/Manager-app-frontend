/**
 * Card-shaped reflection of `StockNeedCard`: same container, radius, border and
 * two-column split, with neutral blocks where the picture, quantity, title,
 * tags and bar will land (`32_loading_skeletons.md`).
 */
export function StockNeedCardSkeleton(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="flex overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      data-testid="stock-need-card-skeleton"
    >
      <div className="flex w-18 shrink-0 flex-col border-r border-light-border">
        <div className="flex flex-1 items-end justify-center px-2 pb-2 pt-3">
          <span className="skeleton-shimmer block size-10 rounded-[10px]" />
        </div>
        <div className="flex flex-1 items-start justify-center px-2 pb-3 pt-1">
          <span className="skeleton-shimmer block h-6 w-10 rounded-md" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3.5 py-3">
        <span className="skeleton-shimmer block h-4 w-32 rounded-md" />
        <div className="flex gap-1.5">
          <span className="skeleton-shimmer block h-5 w-16 rounded-md" />
          <span className="skeleton-shimmer block h-5 w-24 rounded-md" />
        </div>
        <span className="skeleton-shimmer block h-5 w-full rounded-md" />
      </div>
    </div>
  );
}
