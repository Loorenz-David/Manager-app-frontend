import { useState } from "react";

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
  /**
   * Digits-only seed for the tap-to-type editor, e.g. "4524" (owner round 5).
   * Editing is enabled only when both this and `onPerPieceCommit` are present.
   */
  perPieceDigits?: string | null;
  /** Called with the typed whole-kronor per-piece amount when an edit commits. */
  onPerPieceCommit?: (perPieceMajor: number) => void;
};

/**
 * Purely visual thousands spacing for the user's own keystrokes — U+00A0, the
 * same separator the display strings arrive with. Local by design: this
 * component may not import `src/lib/` (master plan §9.4), and no money
 * semantics live here — the committed value is the plain integer.
 */
const GROUP_SEPARATOR = " ";

function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
}

/** The PER PIECE headline block: eyebrow, big amount (tap to type), breakdown lines. */
export function PriceHeadline({
  perPiece,
  currencyCode,
  piecesLine,
  purchaseLine,
  muted = false,
  perPieceDigits = null,
  onPerPieceCommit,
}: PriceHeadlineProps): React.JSX.Element {
  // null = displaying; a string (possibly "") = editing with these digits.
  const [draftDigits, setDraftDigits] = useState<string | null>(null);
  const isEditable = perPieceDigits !== null && onPerPieceCommit !== undefined;

  function commitEdit(): void {
    if (draftDigits === null) return;
    // Empty input or an unchanged value is a cancel, not a zero-price commit.
    if (draftDigits !== "" && draftDigits !== perPieceDigits) {
      onPerPieceCommit?.(Number(draftDigits));
    }
    setDraftDigits(null);
  }

  const amountClassName = cn(
    "text-6xl font-bold tabular-nums leading-none",
    muted ? "text-muted-foreground" : "text-foreground",
  );

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
        Per piece
      </p>

      {draftDigits !== null ? (
        <span className="flex items-baseline justify-center">
          <input
            aria-label="Expected sold price per piece"
            autoFocus
            className={cn(
              amountClassName,
              "min-w-[1ch] bg-transparent text-center outline-none",
            )}
            data-testid="item-valuation-per-piece-input"
            inputMode="numeric"
            pattern="[0-9]*"
            style={{ width: `${Math.max(1, groupDigits(draftDigits).length)}ch` }}
            type="text"
            value={groupDigits(draftDigits)}
            onBlur={commitEdit}
            onChange={(event) =>
              setDraftDigits(event.target.value.replace(/\D/g, "").slice(0, 9))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setDraftDigits(null);
            }}
          />
          <span className="ml-2 text-2xl font-bold text-muted-foreground">
            {currencyCode}
          </span>
        </span>
      ) : isEditable ? (
        <button
          aria-label="Edit expected sold price per piece"
          className="rounded-lg"
          type="button"
          onClick={() => setDraftDigits(perPieceDigits)}
        >
          <span className={amountClassName} data-testid="item-valuation-per-piece">
            {perPiece}
            <span className="ml-2 align-baseline text-2xl font-bold text-muted-foreground">
              {currencyCode}
            </span>
          </span>
        </button>
      ) : (
        <p className={amountClassName} data-testid="item-valuation-per-piece">
          {perPiece}
          <span className="ml-2 align-baseline text-2xl font-bold text-muted-foreground">
            {currencyCode}
          </span>
        </p>
      )}

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
