import { PackageCheck, PackageX } from "lucide-react";

import { cn } from "@beyo/lib";

export type StockReportDetailMenuSheetContentProps = {
  /** Units still unregistered: the ceiling minus what is already missing. */
  markable: number;
  /** Units currently registered as missing. */
  missing: number;
  onMarkMissing: () => void;
  onUnmarkMissing: () => void;
  disabled?: boolean;
};

const ROW_CLASS =
  "flex min-h-12 w-full items-center justify-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left text-sm font-semibold text-foreground disabled:opacity-50";

/**
 * The detail page's ⋮ menu. Two actions that behave as a switch (owner,
 * 2026-09-26): mark everything the workshop cannot cover as missing, or clear
 * the missing count. Each row renders only while it has something to do — a
 * "Mark 0 missing" would be a button that does nothing.
 */
export function StockReportDetailMenuSheetContent({
  markable,
  missing,
  onMarkMissing,
  onUnmarkMissing,
  disabled = false,
}: StockReportDetailMenuSheetContentProps): React.JSX.Element {
  const canMark = markable > 0;
  const canUnmark = missing > 0;

  return (
    <div
      className="flex flex-col gap-2 px-4 pb-4"
      data-testid="stock-report-detail-menu"
    >
      {canMark ? (
        <button
          className={cn(ROW_CLASS)}
          data-testid="stock-report-mark-missing"
          disabled={disabled}
          type="button"
          onClick={onMarkMissing}
        >
          <PackageX aria-hidden="true" className="size-4 shrink-0 text-warning" />
          {`Mark ${markable} missing`}
        </button>
      ) : null}

      {canUnmark ? (
        <button
          className={cn(ROW_CLASS)}
          data-testid="stock-report-unmark-missing"
          disabled={disabled}
          type="button"
          onClick={onUnmarkMissing}
        >
          <PackageCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
          {`Unmark ${missing} missing`}
        </button>
      ) : null}

      {!canMark && !canUnmark ? (
        <p
          className="px-1 py-3 text-sm text-muted-foreground"
          data-testid="stock-report-detail-menu-empty"
        >
          Nothing to mark: every requested unit is queued, in progress or fulfilled.
        </p>
      ) : null}
    </div>
  );
}
