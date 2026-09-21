import { SearchBar } from "@beyo/ui";

export type StockReportSearchRowProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * The search field alone. Sort is hidden because the page does not need it, and
 * the filter button is hidden until a filter exists — a control that does
 * nothing reads as broken (intention §6.3). The value is held so wiring a real
 * search parameter later is one line; typing changes nothing today.
 */
export function StockReportSearchRow({
  value,
  onChange,
}: StockReportSearchRowProps): React.JSX.Element {
  return (
    <SearchBar
      aria-label="Search stock needs"
      data-testid="stock-report-search"
      onChange={onChange}
      placeholder="Search stock need..."
      showFilterButton={false}
      showSortButton={false}
      value={value}
    />
  );
}
