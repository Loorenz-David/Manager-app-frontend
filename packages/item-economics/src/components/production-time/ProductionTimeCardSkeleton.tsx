import { ProductionTimeFrame } from "./ProductionTimeFrame";

const ROW_PLACEHOLDER_KEYS = ["first", "second", "third"] as const;

/**
 * Reflects the real card — headline, bar, three rows, footer — rather than a
 * generic block, so the layout does not jump when the data lands.
 */
export function ProductionTimeCardSkeleton(): React.JSX.Element {
  return (
    <ProductionTimeFrame data-testid="production-time-skeleton">
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="skeleton-shimmer h-7 w-40 rounded" />
          <div className="skeleton-shimmer h-4 w-16 rounded" />
        </div>
        <div className="skeleton-shimmer h-2 w-full rounded-full" />
      </div>

      {ROW_PLACEHOLDER_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-3 px-4 py-4">
          <div className="skeleton-shimmer size-2.5 shrink-0 rounded-[3px]" />
          <div className="skeleton-shimmer h-5 flex-1 rounded" />
          <div className="skeleton-shimmer h-5 w-14 shrink-0 rounded" />
        </div>
      ))}

      <div className="px-4 py-3">
        <div className="skeleton-shimmer h-4 w-48 rounded" />
      </div>
    </ProductionTimeFrame>
  );
}
