/**
 * The S1 loading body — mirrors the editor's real layout (provenance row,
 * headline, slider, table, button) so nothing jumps when the scenario lands.
 * Rendered inside `ItemValuationFrame` by the page, like the real body.
 */
export function ItemValuationSkeleton(): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-8 px-6 py-8"
      data-testid="item-valuation-skeleton"
    >
      <div className="flex items-center gap-3">
        <span className="skeleton-shimmer size-10 rounded-full" />
        <span className="skeleton-shimmer h-5 w-40 rounded" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="skeleton-shimmer h-3 w-20 rounded" />
        <span className="skeleton-shimmer h-14 w-44 rounded" />
        <span className="skeleton-shimmer h-4 w-56 rounded" />
      </div>

      <div className="flex flex-col gap-3">
        <span className="skeleton-shimmer h-2.5 w-full rounded-full" />
        <div className="flex justify-between">
          <span className="skeleton-shimmer h-4 w-20 rounded" />
          <span className="skeleton-shimmer h-4 w-20 rounded" />
        </div>
      </div>

      <span className="skeleton-shimmer h-20 w-full rounded-2xl" />
      <span className="skeleton-shimmer h-14 w-full rounded-2xl" />
    </div>
  );
}
