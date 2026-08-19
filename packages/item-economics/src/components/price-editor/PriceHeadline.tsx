import { cn } from "@beyo/lib";

export type PriceHeadlineProps = {
  /** Formatted per-piece amount, e.g. "2 225" — never a raw number. */
  perPiece: string;
  /** Display code, e.g. "SEK". */
  currencyCode: string;
  /** "× 6 pieces · 13 350 SEK total" — null omits the line. */
  piecesLine: string | null;
  /** "purchase price 2 850 SEK" — null omits the line. */
  purchaseLine: string | null;
  /** The saved-version state renders the number muted (mockup 3). */
  muted?: boolean;
};

/** The PER PIECE headline block: eyebrow, big amount, breakdown lines. */
export function PriceHeadline({
  perPiece,
  currencyCode,
  piecesLine,
  purchaseLine,
  muted = false,
}: PriceHeadlineProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
        Per piece
      </p>
      <p
        className={cn(
          "text-6xl font-bold tabular-nums leading-none",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
        data-testid="item-valuation-per-piece"
      >
        {perPiece}
        <span className="ml-2 align-baseline text-2xl font-bold text-muted-foreground">
          {currencyCode}
        </span>
      </p>
      {piecesLine ? (
        <p
          className="mt-2 text-base font-semibold text-foreground"
          data-testid="item-valuation-total-line"
        >
          {piecesLine}
        </p>
      ) : null}
      {purchaseLine ? (
        <p
          className="text-base text-muted-foreground"
          data-testid="item-valuation-purchase-line"
        >
          {purchaseLine}
        </p>
      ) : null}
    </div>
  );
}
