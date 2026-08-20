import { cn } from "@beyo/lib";
import { ContentCard } from "@beyo/ui";
import { ChevronLeft } from "lucide-react";

export type ItemValuationFrameProps = {
  /** "Expected sold price" — rendered in the frame's own header row. */
  title: string;
  /** e.g. "ITEM 0000608 · DINING CHAIRS (6)" — pre-composed upstream; null omits the line. */
  subtitle: string | null;
  /** The close arrow beside the title — wired to the surface's close funnel. */
  onBackPress?: () => void;
  /**
   * Rendered inside the header block, under the identity line — the
   * provenance row lives here, above the body card.
   */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * The editor's shell (owner redesign 2026-08-20, round 3): the page hides the
 * surface's built-in header and this component owns the whole header stack —
 * back arrow + title, identity line, provenance — so all three rows share one
 * left alignment on the page background, with the body wrapped in a
 * `ContentCard` below.
 */
export function ItemValuationFrame({
  title,
  subtitle,
  onBackPress,
  headerExtra,
  children,
  className,
  "data-testid": testId,
}: ItemValuationFrameProps): React.JSX.Element {
  return (
    <section
      className={cn("flex w-full flex-1 flex-col gap-4 pt-1", className)}
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
          <h1 className="truncate text-lg font-bold text-foreground">
            {title}
          </h1>
        </div>
        {subtitle ? (
          <p className="truncate font-mono text-sm uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
        {headerExtra}
      </header>
      <ContentCard paddingClassName="px-5 py-6">{children}</ContentCard>
    </section>
  );
}
