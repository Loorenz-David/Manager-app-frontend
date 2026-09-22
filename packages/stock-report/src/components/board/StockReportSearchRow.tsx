import { SearchBar } from "@beyo/ui";

export type StockReportSearchRowProps = {
  value: string;
  onChange: (value: string) => void;
  /** Filters that differ from the role's default view; badge when above zero. */
  activeFilterCount: number;
  onFilterPress: () => void;
};

/**
 * The search field with its filter button. Sort is hidden because the page does
 * not need it. The text value is held but changes nothing yet — no search
 * parameter exists (owner: a later fix); the filter button opens the
 * major-category sheet (owner, 2026-09-22).
 */
export function StockReportSearchRow({
  value,
  onChange,
  activeFilterCount,
  onFilterPress,
}: StockReportSearchRowProps): React.JSX.Element {
  return (
    <SearchBar
      activeFilterCount={activeFilterCount}
      aria-label="Search stock needs"
      data-testid="stock-report-search"
      onChange={onChange}
      onFilterPress={onFilterPress}
      placeholder="Search stock need..."
      showFilterButton
      showSortButton={false}
      value={value}
    />
  );
}
