import { useEffect } from "react";

import { useSurface } from "@/hooks/use-surface";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";

import {
  UPHOLSTERY_ORDER_ACTIONS_SHEET_ID,
  UPHOLSTERY_ORDER_AMOUNT_SHEET_ID,
  type OrderActionsSurfaceProps,
  type OrderAmountSurfaceProps,
} from "../surfaces";

export function OrderActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { order } = useSurfaceProps<OrderActionsSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Order actions");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col gap-3 p-6">
      <button
        className="w-full rounded-2xl bg-primary px-4 py-3.5 text-md font-semibold text-card shadow-sm disabled:opacity-50"
        data-testid="upholstery-order-actions-change-amount"
        disabled={!order}
        type="button"
        onClick={() => {
          if (!order) return;
          surface.close(UPHOLSTERY_ORDER_ACTIONS_SHEET_ID);
          surface.open(UPHOLSTERY_ORDER_AMOUNT_SHEET_ID, {
            order,
          } satisfies OrderAmountSurfaceProps);
        }}
      >
        Change ordered amount
      </button>
    </div>
  );
}
