import { cn } from "@beyo/lib";

export type PurchaseBootstrapCardProps = {
  /** Which §3.3 branch the user is in — authored upstream, one message at a time. */
  message: string;
  /** A failed fetch/PUT surfaces here, above the CTA. Null when clean. */
  errorMessage?: string | null;
  /** "Fetch purchase price" */
  ctaLabel: string;
  /** Disabled from the start when the item has no article number (§3.3). */
  isCtaDisabled: boolean;
  isCtaPending?: boolean;
  onCtaPress: () => void;
};

/**
 * The purchase-required body (screen state S4): the PER PIECE slot keeps its
 * frame with a shimmer instead of a number — there is deliberately no zero to
 * show (intention §1.3) — then the branch message and the fetch CTA.
 */
export function PurchaseBootstrapCard({
  message,
  errorMessage = null,
  ctaLabel,
  isCtaDisabled,
  isCtaPending = false,
  onCtaPress,
}: PurchaseBootstrapCardProps): React.JSX.Element {
  const disabled = isCtaDisabled || isCtaPending;

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Per piece
        </p>
        <span className="skeleton-shimmer h-2.5 w-16 rounded-full" />
      </div>

      <p
        className="max-w-md text-lg text-muted-foreground"
        data-testid="item-valuation-bootstrap-message"
      >
        {message}
      </p>

      {errorMessage ? (
        <p
          className="text-sm font-medium text-[#b9382a]"
          data-testid="item-valuation-bootstrap-error"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        aria-busy={isCtaPending}
        className={cn(
          "w-full rounded-2xl py-4 text-base font-semibold transition-colors",
          disabled
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground",
        )}
        data-testid="item-valuation-fetch-purchase"
        disabled={disabled}
        onClick={onCtaPress}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
