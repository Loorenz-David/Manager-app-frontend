import {
  formatMinorPrice,
  formatPieces,
  formatPrice,
  resolveTotalMinor,
} from "../../lib/item-pricing";

export type ItemPricingTotalRowProps = {
  /** Price of one piece, in kronor as typed. */
  perPiece: number | null;
  quantity: number;
  /** Prefix for this field's test ids, e.g. `item-purchase-price`. */
  testId: string;
};

/**
 * The running total under a per-piece price input: what the user typed, times
 * how many pieces, equals what will actually be saved.
 *
 * Only rendered for seats. A wood item is always one piece, so "1 pc × 1 200 kr
 * = 1 200 kr" would restate the input rather than explain it.
 */
export function ItemPricingTotalRow({
  perPiece,
  quantity,
  testId,
}: ItemPricingTotalRowProps): React.JSX.Element {
  const totalMinor = resolveTotalMinor(perPiece, quantity);

  return (
    <div
      className="flex items-end justify-between gap-3 border-t border-[var(--color-between-border)] pt-3"
      data-testid={`${testId}-total`}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Total
        </span>
        <span
          className="truncate text-sm text-muted-foreground"
          data-testid={`${testId}-breakdown`}
        >
          {formatPieces(quantity)}
          {perPiece == null ? "" : ` × ${formatPrice(perPiece)}`}
        </span>
      </div>
      <span className="shrink-0 text-2xl font-bold tabular-nums text-foreground">
        {totalMinor == null ? "—" : formatMinorPrice(totalMinor)}
      </span>
    </div>
  );
}
