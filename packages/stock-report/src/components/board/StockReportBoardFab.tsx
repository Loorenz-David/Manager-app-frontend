import { FabButton } from "@beyo/ui";
import { ArrowDownUp, Check } from "lucide-react";

export type StockReportBoardFabProps = {
  isReorganiseMode: boolean;
  onToggleReorganise: () => void;
};

/**
 * The board's FAB: one button that toggles reorganise mode, showing the sort
 * glyph on the way in and a checkmark on the way out.
 *
 * It is a `FabButton`, not a `FabMenu` (owner, 2026-09-22). There is exactly
 * one action on this page today, and expanding a menu to reveal a lone button
 * costs a tap to answer a question nobody asked — in either direction.
 *
 * **When a second action arrives, this goes back to `FabMenu`** (the primitive
 * is in `@beyo/ui` and unchanged, with `reorganise` as one of its `actions`).
 * That is the reason the menu exists: a choice between actions is what it is
 * for, and a single action is not a choice. Do not add a second `FabButton`
 * beside this one — two floating buttons share one anchor and would stack.
 *
 * Workers are not given a FAB at all: the board renders it only when the role
 * can prioritise (intention §5).
 */
export function StockReportBoardFab({
  isReorganiseMode,
  onToggleReorganise,
}: StockReportBoardFabProps): React.JSX.Element {
  return (
    <FabButton
      dataTestId="stock-report-fab"
      icon={
        isReorganiseMode ? (
          <Check aria-hidden="true" className="size-5" />
        ) : (
          <ArrowDownUp aria-hidden="true" className="size-5" />
        )
      }
      label={isReorganiseMode ? "Done reorganising" : "Reorganise"}
      onPress={onToggleReorganise}
    />
  );
}
