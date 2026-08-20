import { cn } from "@beyo/lib";

export type ItemValuationFrameProps = {
  /** e.g. "ITEM 0000608 · DINING CHAIRS (6)" — pre-composed upstream; null omits the line. */
  subtitle: string | null;
  /**
   * Rendered inside the header block, above the divider — the provenance row
   * lives here so the divider separates identity from the editor body.
   */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * The editor's full-bleed body shell (owner redesign 2026-08-20): the page IS
 * the editor — no nested card. The "Expected sold price" title lives in the
 * slide surface header beside the back arrow, set by the page; this component
 * owns only the item identity line, the provenance slot and the divider. The
 * decorative three-dot menu was removed entirely.
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
      className={cn("flex w-full flex-1 flex-col bg-card", className)}
      data-testid={testId}
    >
      <header
        className="flex flex-col gap-4 px-6 pb-5 pt-2"
        data-testid="item-valuation-header"
      >
        {subtitle ? (
          <p className="truncate font-mono text-sm uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
        {headerExtra}
      </header>
      <div className="flex flex-1 flex-col border-t border-border">
        {children}
      </div>
    </section>
  );
}
