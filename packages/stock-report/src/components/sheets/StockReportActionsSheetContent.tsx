import { ConfirmActionButton } from "@beyo/ui";
import { Trash2 } from "lucide-react";

export type StockReportActionsSheetContentProps = {
  onRemove: () => void;
  disabled?: boolean;
};

/**
 * This page's own ⋮ menu — not the task page's (intention §6.2, card 5). One
 * action today: taking the assignment off the stock need. The confirm step is
 * the repo's standard tap-again button rather than a second surface (§12B B19).
 *
 * A role that cannot remove is simply never given the ⋮, so this sheet is never
 * opened for sellers.
 */
export function StockReportActionsSheetContent({
  onRemove,
  disabled = false,
}: StockReportActionsSheetContentProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-2 px-4 pb-4"
      data-testid="stock-report-actions-sheet"
    >
      <ConfirmActionButton
        backgroundColor="var(--color-card)"
        borderColor="var(--color-border)"
        className="w-full py-3.5 text-left font-semibold"
        confirmLabel="Tap again to remove"
        confirmTextColor="white"
        data-testid="stock-report-remove-assignment"
        disabled={disabled}
        fillColor="var(--color-destructive)"
        icon={<Trash2 className="size-4 shrink-0" />}
        label="Remove from stock need"
        textColor="var(--color-primary)"
        onConfirm={onRemove}
      />
    </div>
  );
}
