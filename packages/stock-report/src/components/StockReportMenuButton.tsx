export type StockReportMenuButtonProps = {
  /** The accessible name: what the menu is about ("Stock need actions", "Version actions"). */
  label: string;
  onPress: () => void;
  "data-testid"?: string;
};

/**
 * The ⋮ that opens a page's actions sheet: three dots drawn as spans, the
 * same 36 px round target the detail page's header registered first (owner,
 * 2026-09-26). Shared so the board and draft-board headers and the detail
 * page draw one glyph.
 */
export function StockReportMenuButton({
  label,
  onPress,
  "data-testid": testId,
}: StockReportMenuButtonProps): React.JSX.Element {
  return (
    <button
      aria-label={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
      data-testid={testId}
      type="button"
      onClick={onPress}
    >
      <span className="flex flex-col items-center gap-0.5">
        {[0, 1, 2].map((index) => (
          <span key={index} className="size-1 rounded-full bg-current" />
        ))}
      </span>
    </button>
  );
}
