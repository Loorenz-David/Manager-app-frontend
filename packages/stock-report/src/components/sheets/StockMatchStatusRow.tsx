import { Loader2, TriangleAlert } from "lucide-react";

export type StockMatchStatusRowState = "idle" | "checking" | "mismatch-accepted";

export type StockMatchStatusRowProps = {
  state: StockMatchStatusRowState;
  /** Reopens the match sheet. Only meaningful for `mismatch-accepted`. */
  onPress?: () => void;
};

/**
 * The one line stock-assignment mode adds to the task-creation form, rendered
 * by the logic session through a generic slot under the item-identity field
 * (§12A A4, §12B B12).
 *
 * A check in flight gets a spinner rather than a skeleton: its duration is
 * unknown and it has no layout of its own to preview
 * (`32_loading_skeletons.md`). A match says nothing at all. An accepted
 * mismatch stays as a quiet, tappable line so the armed override remains
 * visible until the item changes (§12A A6a).
 */
export function StockMatchStatusRow({
  state,
  onPress,
}: StockMatchStatusRowProps): React.JSX.Element | null {
  if (state === "idle") {
    return null;
  }

  if (state === "checking") {
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

  return (
    <button
      className="flex items-center gap-2 py-1 text-left text-xs font-medium text-muted-foreground"
      data-state="mismatch-accepted"
      data-testid="stock-match-status-row"
      type="button"
      onClick={onPress}
    >
      <TriangleAlert aria-hidden="true" className="size-3.5 text-warning" />
      <span className="underline underline-offset-2">Mismatch accepted</span>
    </button>
  );
}
