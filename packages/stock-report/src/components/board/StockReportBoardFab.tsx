import { FabMenu } from "@beyo/ui";
import { ArrowDownUp, Check } from "lucide-react";

export type StockReportBoardFabProps = {
  isReorganiseMode: boolean;
  onToggleReorganise: () => void;
};

/**
 * The board's FAB. One action today — enter or leave reorganise mode — through
 * the shared `FabMenu` primitive, so a third hand-rolled FAB is not written
 * (intention §6.1). Workers are not given one: the board renders it only when
 * the role can prioritise.
 */
export function StockReportBoardFab({
  isReorganiseMode,
  onToggleReorganise,
}: StockReportBoardFabProps): React.JSX.Element {
  return (
    <FabMenu
      actions={[
        {
          id: "reorganise",
          label: isReorganiseMode ? "Done reorganising" : "Reorganise",
          icon: isReorganiseMode ? (
            <Check aria-hidden="true" className="size-5" />
          ) : (
            <ArrowDownUp aria-hidden="true" className="size-5" />
          ),
          onPress: onToggleReorganise,
        },
      ]}
      dataTestId="stock-report-fab"
    />
  );
}
