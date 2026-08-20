import { cn } from "@beyo/lib";
import { ContentCard } from "@beyo/ui";

export type ItemValuationFrameProps = {
  /** e.g. "ITEM 0000608 · DINING CHAIRS (6)" — pre-composed upstream; null omits the line. */
  subtitle: string | null;
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
 * The editor's shell (owner redesign 2026-08-20, corrected same day): the
 * "Expected sold price" title lives in the slide surface header beside the
 * back arrow (set by the page); this component renders the identity +
 * provenance header on the page background — no card, no fill — and wraps
 * everything below it in a `ContentCard`.
 */
export function ItemValuationFrame({
  subtitle,
  headerExtra,
  children,
  className,
  "data-testid": testId,
}: ItemValuationFrameProps): React.JSX.Element {
  return (
    <section
      className={cn("flex w-full flex-1 flex-col gap-4 px-4 pt-1", className)}
      data-testid={testId}
    >
      <header
        className="flex flex-col gap-4 px-2"
        data-testid="item-valuation-header"
      >
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
