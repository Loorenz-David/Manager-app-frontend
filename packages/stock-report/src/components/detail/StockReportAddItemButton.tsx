import { Plus } from "lucide-react";

export type StockReportAddItemButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

/**
 * The page's one constructive action, deliberately quiet: dashed, transparent,
 * neutral ink. It reads as "add a slot", not as a page-level CTA — a solid
 * high-contrast version was rejected during design.
 */
export function StockReportAddItemButton({
  onPress,
  disabled = false,
}: StockReportAddItemButtonProps): React.JSX.Element {
  return (
    <button
      className="flex w-full items-center justify-center gap-2.5 rounded-xl  bg-primary shadow-sm px-4 py-3 text-white font-semibold  disabled:opacity-50"
      data-testid="stock-report-add-item"
      disabled={disabled}
      type="button"
      onClick={onPress}
    >
      <Plus aria-hidden="true" className="size-5" strokeWidth={2.2} />
      Add item
    </button>
  );
}
