import { PackageCheck, PackageX, PencilLine, Undo2 } from "lucide-react";

import { cn } from "@beyo/lib";

export type StockReportDetailMenuSheetContentProps = {
  /** Units still unregistered: the ceiling minus what is already missing. */
  markable: number;
  /** Units currently registered as missing. */
  missing: number;
  onMarkMissing: () => void;
  onUnmarkMissing: () => void;
  /**
   * Whether the Mark / Unmark / Follow rows render at all (projection R3): a
   * seller reaches this sheet for the requested row alone and sees none of
   * them, not even the "nothing to mark" line.
   */
  canMarkMissing?: boolean;
  /** "Set requested quantity" (OC-10): rendered only when supplied — sellers, managers, admins. */
  onSetRequested?: () => void;
  /**
   * "Follow the live version" (OC-14, v9 §5.16): rendered only when supplied —
   * the detail page passes it on a draft whose row has its own missing count.
   */
  onFollowLive?: () => void;
  disabled?: boolean;
};

export const ROW_CLASS =
  "flex min-h-12 w-full items-center justify-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left text-sm font-semibold text-foreground disabled:opacity-50";

/**
 * The detail page's ⋮ menu. Two actions that behave as a switch (owner,
 * 2026-09-26): mark everything the workshop cannot cover as missing, or clear
 * the missing count. Each row renders only while it has something to do — a
 * "Mark 0 missing" would be a button that does nothing. Around them, the rows
 * the draft-versions round added: the requested quantity before, and on a
 * draft the way back to the board's missing count after.
 */
export function StockReportDetailMenuSheetContent({
  markable,
  missing,
  onMarkMissing,
  onUnmarkMissing,
  canMarkMissing = true,
  onSetRequested,
  onFollowLive,
  disabled = false,
}: StockReportDetailMenuSheetContentProps): React.JSX.Element {
  const canMark = canMarkMissing && markable > 0;
  const canUnmark = canMarkMissing && missing > 0;

  return (
    <div
      className="flex flex-col gap-2 px-4 pb-4"
      data-testid="stock-report-detail-menu"
    >
      {onSetRequested ? (
        <button
          className={cn(ROW_CLASS)}
          data-testid="stock-report-set-requested"
          disabled={disabled}
          type="button"
          onClick={onSetRequested}
        >
          <PencilLine aria-hidden="true" className="size-4 shrink-0 text-primary" />
          Set requested quantity
        </button>
      ) : null}

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

      {canMarkMissing && onFollowLive ? (
        <button
          className={cn(ROW_CLASS)}
          data-testid="stock-report-follow-live"
          disabled={disabled}
          type="button"
          onClick={onFollowLive}
        >
          <Undo2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          Follow the live version
        </button>
      ) : null}

      {canMarkMissing && !canMark && !canUnmark ? (
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
