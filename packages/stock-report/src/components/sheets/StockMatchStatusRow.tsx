import { Loader2 } from "lucide-react";

export type StockMatchStatusRowState = "idle" | "checking";

export type StockMatchStatusRowProps = {
  state: StockMatchStatusRowState;
};

/**
 * The one line stock-assignment mode adds to the task-creation form, rendered
 * by the logic session through a generic slot under the item-identity field
 * (§12A A4, §12B B12).
 *
 * A check in flight gets a spinner rather than a skeleton: its duration is
 * unknown and it has no layout of its own to preview
 * (`32_loading_skeletons.md`), and it is not a warning, so it stays neutral. A
 * match says nothing at all, and a mismatch is a block that lives in the sheet
 * — there is no accepted state left to show (owner, 2026-09-28).
 */
export function StockMatchStatusRow({
  state,
}: StockMatchStatusRowProps): React.JSX.Element | null {
  if (state === "idle") {
    return null;
  }

  return (
    <p
      className="flex items-center gap-2 py-1 text-xs font-medium text-muted-foreground"
      data-state="checking"
      data-testid="stock-match-status-row"
    >
      <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
      Checking stock need match…
    </p>
  );
}
