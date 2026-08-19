import { cn } from "@beyo/lib";
import { EllipsisVertical } from "lucide-react";

export type ItemValuationFrameProps = {
  title: string;
  /** e.g. "ITEM 0000608 · DINING CHAIRS (6)" — pre-composed upstream; null omits the line. */
  subtitle: string | null;
  /**
   * Rendered inside the header block, above the divider — the provenance row
   * lives here so the divider separates identity from the editor body, as in
   * the design.
   */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * The card shell for the expected-sold-price editor: title, item subtitle,
 * a decorative three-dot button (no action this iteration — intention §3.4),
 * an optional header slot, then a divider and the body.
 */
export function ItemValuationFrame({
  title,
  subtitle,
  headerExtra,
  children,
  className,
  "data-testid": testId,
}: ItemValuationFrameProps): React.JSX.Element {
  return (
    <section
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
      data-testid={testId}
    >
      <header
        className="flex flex-col gap-4 px-6 pb-5 pt-6"
        data-testid="item-valuation-header"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            {subtitle ? (
              <p className="truncate font-mono text-sm uppercase tracking-wider text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="More options"
            className="shrink-0 rounded-full p-1.5 text-muted-foreground"
            data-testid="item-valuation-menu-button"
          >
            <EllipsisVertical aria-hidden="true" className="size-5" />
          </button>
        </div>
        {headerExtra}
      </header>
      <div className="flex flex-col border-t border-border">{children}</div>
    </section>
  );
}
