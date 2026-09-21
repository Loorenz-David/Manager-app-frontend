export type StockReportSelectedItemsHeaderProps = {
  count: number;
};

export function StockReportSelectedItemsHeader({
  count,
}: StockReportSelectedItemsHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-2.5 pt-4">
      <span className="text-[15px] font-bold tracking-tight text-foreground">
        Selected items
      </span>
      <span
        className="text-[13px] font-medium text-muted-foreground"
        data-testid="stock-report-assignment-count"
      >
        {count === 1 ? "1 item" : `${count} items`}
      </span>
    </div>
  );
}
