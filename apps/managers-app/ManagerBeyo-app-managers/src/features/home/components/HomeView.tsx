import { usePendingSeatCountsQuery } from "@/features/pending-upholstery/api/use-pending-seat-counts-query";
import { useOrderNeedsCountQuery } from "@/features/upholstery-ordering/api/use-upholstery-ordering-queries";
import { formatCompactCount } from "@/features/pending-upholstery/lib/format-compact-count";
import { PENDING_UPHOLSTERY_SLIDE_ID } from "@/features/pending-upholstery";
import { UPHOLSTERY_ORDERING_SLIDE_ID } from "@/features/upholstery-ordering";
import { useSurface } from "@/hooks/use-surface";
import ThreadIcon from "@/assets/icons/thread-svgrepo-com.svg?react";
import ClipboardIcon from "@/assets/icons/ClipboardIcon.svg?react";

export function HomeView(): React.JSX.Element {
  const countsQuery = usePendingSeatCountsQuery();
  const orderingCountQuery = useOrderNeedsCountQuery();
  const surface = useSurface();
  const total = countsQuery.data
    ? countsQuery.data.missing_selection_total +
      countsQuery.data.missing_quantity_total
    : null;
  const countLabel = total !== null ? ` (${formatCompactCount(total)})` : "";
  const orderingCountLabel = orderingCountQuery.data
    ? ` (${formatCompactCount(orderingCountQuery.data.needs_ordering_count)})`
    : "";

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Home</h1>
      <button
        className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3.5 text-left text-lg font-medium text-primary shadow-sm disabled:opacity-50"
        type="button"
        onClick={() => surface.open(PENDING_UPHOLSTERY_SLIDE_ID, {})}
      >
        <span>Select upholstery{countLabel}</span>
        <div className="flex ml-auto">
          <ThreadIcon aria-hidden="true" className="size-8 shrink-0" />
        </div>
      </button>
      <button
        className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3.5 text-left text-lg font-medium text-primary shadow-sm disabled:opacity-50"
        type="button"
        onClick={() => surface.open(UPHOLSTERY_ORDERING_SLIDE_ID, {})}
      >
        <span>Ordering{orderingCountLabel}</span>
        <div className="flex ml-auto">
          <ClipboardIcon aria-hidden="true" className="size-8 shrink-0" />
        </div>
      </button>
    </div>
  );
}
