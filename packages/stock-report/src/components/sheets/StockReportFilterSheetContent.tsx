import { ItemMajorCategoryPicker } from "@beyo/item-categories";
import type { MajorCategory } from "@beyo/lib";

export type StockReportFilterSheetContentProps = {
  /** The draft, not the applied filter — nothing changes until Apply. */
  value: MajorCategory | null;
  /**
   * Fires with the tapped category, the selected one included; the page turns
   * a repeat tap into `null` (tap again to see all — owner, 2026-09-22).
   */
  onChange: (value: MajorCategory) => void;
  /** Back to the role default, draft only. */
  onClear: () => void;
  onApply: () => void;
};

/**
 * The board's filter sheet: the same Wood / Seat picker the creation forms use,
 * single-select, with Clear and Apply. Layout follows the cases filter sheet.
 */
export function StockReportFilterSheetContent({
  value,
  onChange,
  onClear,
  onApply,
}: StockReportFilterSheetContentProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-6 px-4 pb-[calc(var(--safe-bottom,0px)+1.5rem)] pt-4"
      data-testid="stock-report-filter-sheet"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Filters</h2>
        <button
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          data-testid="stock-report-filter-clear"
          type="button"
          onClick={onClear}
        >
          Clear
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Item type</p>
        <ItemMajorCategoryPicker
          data-testid="stock-report-filter-major-category"
          getOptionTestId={(option) => `stock-report-filter-major-${option.value}`}
          value={value}
          onValueChange={onChange}
        />
      </div>

      <button
        className="mt-2 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-card"
        data-testid="stock-report-filter-apply"
        type="button"
        onClick={onApply}
      >
        Apply
      </button>
    </div>
  );
}
