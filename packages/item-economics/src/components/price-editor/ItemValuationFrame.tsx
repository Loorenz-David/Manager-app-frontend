import { cn } from "@beyo/lib";
import { ContentCard } from "@beyo/ui";
import { ChevronLeft } from "lucide-react";

export type ItemValuationFrameHeaderIdentity = {
  /** e.g. "0000608" — rendered bold with a leading "#"; null omits it. */
  articleNumber: string | null;
  /** e.g. "DINING CHAIRS (6)" — rendered light; null omits it. */
  detail: string | null;
};

export type ItemValuationFrameProps = {
  /**
   * "Expected sold price" — the header row's accessible name, always. It's
   * also what renders beside the arrow when there is no identity to show
   * instead (§3.4's unbound/no-item case).
   */
  title: string;
  /**
   * The item identity — article number and type/quantity — rendered beside
   * the back arrow in place of `title` (owner redesign 2026-08-24): the
   * article number keeps the row's heading boldness, the rest renders light.
   * Null falls back to `title`.
   */
  identity: ItemValuationFrameHeaderIdentity | null;
  /** The close arrow beside the title — wired to the surface's close funnel. */
  onBackPress?: () => void;
  /**
   * Rendered inside the header block, under the identity row — the
   * provenance row lives here, above the body card.
   */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * The editor's shell (owner redesign 2026-08-20, round 3; header row redesign
 * 2026-08-24): the page hides the surface's built-in header and this
 * component owns the whole header stack — back arrow + identity, provenance —
 * so both rows share one left alignment on the page background, with the body
 * wrapped in a `ContentCard` below.
 */
export function ItemValuationFrame({
  title,
  identity,
  onBackPress,
  headerExtra,
  children,
  className,
  "data-testid": testId,
}: ItemValuationFrameProps): React.JSX.Element {
  const hasIdentity =
    identity !== null &&
    (identity.articleNumber !== null || identity.detail !== null);

  return (
    <section
      className={cn("flex w-full flex-1 flex-col gap-4 pt-4", className)}
      data-testid={testId}
    >
      <header
        className="flex flex-col gap-4 px-5"
        data-testid="item-valuation-header"
      >
        <div className="flex min-h-9 items-center gap-2">
          <button
            aria-label="Go back"
            className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
            data-testid="item-valuation-back-arrow"
            type="button"
            onClick={onBackPress}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          {/* The accessible name is always the page title, whether or not
              the identity renders in its place visually (22g). */}
          <h1
            aria-label={title}
            className="truncate text-md font-bold text-foreground"
          >
            {hasIdentity ? (
              <span aria-hidden="true">
                {identity.articleNumber !== null ? (
                  <span>#{identity.articleNumber}</span>
                ) : null}
                {identity.detail !== null ? (
                  <span className="font-normal text-muted-foreground text-sm">
                    {identity.articleNumber !== null
                      ? ` · ${identity.detail}`
                      : identity.detail}
                  </span>
                ) : null}
              </span>
            ) : (
              <span aria-hidden="true">{title}</span>
            )}
          </h1>
        </div>
        {headerExtra}
      </header>
      <ContentCard paddingClassName="px-5 py-6">{children}</ContentCard>
    </section>
  );
}
