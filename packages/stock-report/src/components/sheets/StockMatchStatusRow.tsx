import { Loader2, TriangleAlert } from "lucide-react";

import { MATCH_WARNING_BANNER_CLASS } from "../../lib/stock-report-theme";

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
 * (`32_loading_skeletons.md`), and it is not a warning, so it stays neutral. A
 * match says nothing at all.
 *
 * An accepted mismatch keeps the armed override visible until the item changes
 * (§12A A6a), wearing the same amber banner as the sheet that armed it (owner,
 * 2026-09-22) — §12A A6a's "quiet line" is superseded. The two are the same
 * fact in two places, and a form the user has overridden should look overridden
 * rather than merely annotated.
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
      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium ${MATCH_WARNING_BANNER_CLASS}`}
      data-state="mismatch-accepted"
      data-testid="stock-match-status-row"
      type="button"
      onClick={onPress}
    >
      {/* No colour of its own — it inherits the banner's amber ink. */}
      <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="underline underline-offset-2">Mismatch accepted</span>
    </button>
  );
}
