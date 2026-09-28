import { RefreshCw, Undo2 } from "lucide-react";

import { ConfirmActionButton } from "@beyo/ui";

import { StockInfoNote } from "./StockInfoNote";

export type StockReportRefreshSheetContentProps = {
  disabled?: boolean;
  /** `keep_manual_requested: true` — only rows without a typed value take Scanner's number. */
  onKeepTyped: () => void;
  /** `keep_manual_requested: false` — every row takes Scanner's number. */
  onReplaceTyped: () => void;
};

/**
 * Refresh the live version from Scanner (plan §G.9, OC-12): what happens, in
 * plain words, then the one choice that matters. All three lines always show
 * (#22): the list cache is partial, so the page cannot tell whether any row
 * was typed by hand. Replacing discards work, so it asks twice.
 */
export function StockReportRefreshSheetContent({
  disabled = false,
  onKeepTyped,
  onReplaceTyped,
}: StockReportRefreshSheetContentProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 px-4 pb-4" data-testid="stock-report-refresh-sheet">
      <StockInfoNote data-testid="stock-report-refresh-note">
        <p>The live version keeps the quantities it was frozen with.</p>
        <p>This takes today&apos;s Scanner quantities instead.</p>
        <p>Rows with a quantity typed by hand — choose what happens to them.</p>
      </StockInfoNote>

      <button
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-card disabled:opacity-50"
        data-testid="stock-report-refresh-keep"
        disabled={disabled}
        type="button"
        onClick={onKeepTyped}
      >
        <RefreshCw aria-hidden="true" className="size-4 shrink-0" />
        Keep typed values
      </button>

      <ConfirmActionButton
        align="center"
        // No `flex` here: the primitive centres its own label span, and a flex
        // button shrinks that span to its text, pinning the label left.
        className="min-h-12 w-full px-4 text-sm font-semibold text-foreground"
        confirmLabel="Tap again to replace"
        data-testid="stock-report-refresh-replace"
        disabled={disabled}
        icon={<Undo2 aria-hidden="true" className="size-4 shrink-0" />}
        label="Replace typed values too"
        onConfirm={onReplaceTyped}
      />
    </div>
  );
}
