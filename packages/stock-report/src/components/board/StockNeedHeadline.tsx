import { cn } from "@beyo/lib";

export type StockNeedHeadlineProps = {
  /** The item category's name — the small line above the headline. */
  category: string;
  /**
   * The already-formatted criteria line (`toStockReportPropertyHeadline`).
   * `null` promotes the category name into the headline slot, so a row that
   * asks for nothing still reads with a title rather than an empty one.
   */
  headline: string | null;
  className?: string;
  "data-testid"?: string;
};

/**
 * The stock need's title block, shared by the board card and the detail
 * summary card: the category as a small uppercase eyebrow, and what the row
 * asks for as the bold line under it (owner, 2026-09-28 — this replaced one
 * pill per criterion, which read as a row of equal-weight chips).
 */
export function StockNeedHeadline({
  category,
  headline,
  className,
  "data-testid": testId,
}: StockNeedHeadlineProps): React.JSX.Element {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-0.5", className)}
      data-testid={testId}
    >
      {headline ? (
        <span
          className="truncate text-[11px] font-semibold uppercase leading-tight tracking-wider text-muted-foreground"
          data-testid={testId ? `${testId}-category` : undefined}
        >
          {category}
        </span>
      ) : null}
      {/* Wraps rather than truncates: a long criteria set is the whole point
          of the card and has to stay readable. */}
      <span
        className="break-words text-lg font-bold leading-tight tracking-tight text-foreground"
        data-testid={testId ? `${testId}-text` : undefined}
      >
        {headline ?? category}
      </span>
    </div>
  );
}
