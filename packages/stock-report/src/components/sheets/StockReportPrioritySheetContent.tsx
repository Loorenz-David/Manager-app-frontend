import { Check } from "lucide-react";

import { cn } from "@beyo/lib";

import {
  STOCK_NEED_BUCKETS,
  STOCK_NEED_BUCKET_LABEL,
  type StockNeedBucket,
} from "../../stock-report.types";

export type StockReportPrioritySheetContentProps = {
  /** The row's current priority — `unset` when it has none. */
  current: StockNeedBucket;
  onSelect: (priority: StockNeedBucket) => void;
  disabled?: boolean;
};

/**
 * The four choices behind a card's "Set priority" button. Choosing a different
 * one moves the row out of the bucket being viewed; choosing the current one is
 * not sent at all (intention §8.4) — that call is the action hook's, so this
 * component reports every choice and judges none.
 */
export function StockReportPrioritySheetContent({
  current,
  onSelect,
  disabled = false,
}: StockReportPrioritySheetContentProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-2 px-4 pb-2"
      data-testid="stock-report-priority-sheet"
    >
      {STOCK_NEED_BUCKETS.map((priority) => {
        const isCurrent = priority === current;

        return (
          <button
            key={priority}
            aria-pressed={isCurrent}
            className={cn(
              "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5 text-sm font-semibold text-foreground",
              isCurrent ? "border-foreground/30" : "border-border",
              disabled && "pointer-events-none opacity-50",
            )}
            data-testid={`stock-report-priority-${priority}`}
            disabled={disabled}
            type="button"
            onClick={() => onSelect(priority)}
          >
            {STOCK_NEED_BUCKET_LABEL[priority]}
            {isCurrent ? (
              <Check aria-hidden="true" className="size-4 shrink-0" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
