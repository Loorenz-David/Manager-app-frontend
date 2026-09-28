import { Pencil, Play, RefreshCw, Trash2 } from "lucide-react";

import { cn } from "@beyo/lib";
import { ConfirmActionButton } from "@beyo/ui";

import type { StockReportVersionState } from "../../stock-report.types";
import { ROW_CLASS } from "./StockReportDetailMenuSheetContent";

export type StockReportVersionActionsSheetContentProps = {
  state: StockReportVersionState;
  onEdit: () => void;
  onRefresh: () => void;
  onActivate: () => void;
  onDelete: () => void;
  /** Every row, while any of the sheet's requests is in flight. */
  disabled?: boolean;
};

/**
 * A version's ⋮ menu (plan §G.5). Which rows show is the version's state:
 *
 * | Row | Draft | Active |
 * |---|---|---|
 * | Edit version | ✓ | ✓ |
 * | Refresh from Scanner | — | ✓ (v8 §5.18: the live version only) |
 * | Activate now | ✓ | — |
 * | Delete draft | ✓ (tap-again, last) | — |
 *
 * A closed version never reaches this sheet; if one did it would show no row.
 * Refresh and Activate open their own sheets, which ask the one question each
 * needs (OC-12, OC-15); Delete confirms in place.
 */
export function StockReportVersionActionsSheetContent({
  state,
  onEdit,
  onRefresh,
  onActivate,
  onDelete,
  disabled = false,
}: StockReportVersionActionsSheetContentProps): React.JSX.Element {
  const isDraft = state === "draft";
  const isActive = state === "active";

  return (
    <div className="flex flex-col gap-2 px-4 pb-4" data-testid="stock-report-version-actions">
      {isDraft || isActive ? (
        <button className={cn(ROW_CLASS)} data-testid="stock-report-version-edit" disabled={disabled} type="button" onClick={onEdit}>
          <Pencil aria-hidden="true" className="size-4 shrink-0 text-primary" />
          Edit version
        </button>
      ) : null}

      {isActive ? (
        <button className={cn(ROW_CLASS)} data-testid="stock-report-version-refresh" disabled={disabled} type="button" onClick={onRefresh}>
          <RefreshCw aria-hidden="true" className="size-4 shrink-0 text-primary" />
          Refresh from Scanner
        </button>
      ) : null}

      {isDraft ? (
        <button className={cn(ROW_CLASS)} data-testid="stock-report-version-activate" disabled={disabled} type="button" onClick={onActivate}>
          <Play aria-hidden="true" className="size-4 shrink-0 text-primary" />
          Activate now
        </button>
      ) : null}

      {isDraft ? (
        // Passive: red border and red text on the card (owner, 2026-09-28). The
        // first tap fills it red left to right, and the primitive clips a white
        // label to the fill.
        <ConfirmActionButton
          backgroundColor="var(--color-card)"
          borderColor="var(--color-destructive)"
          className="flex min-h-12 w-full items-center gap-3 px-4 py-3.5 text-sm font-semibold"
          confirmLabel="Tap again to delete"
          confirmTextColor="white"
          data-testid="stock-report-version-delete"
          disabled={disabled}
          fillColor="var(--color-destructive)"
          icon={<Trash2 aria-hidden="true" className="size-4 shrink-0" />}
          label="Delete draft"
          textColor="var(--color-destructive)"
          onConfirm={onDelete}
        />
      ) : null}
    </div>
  );
}
