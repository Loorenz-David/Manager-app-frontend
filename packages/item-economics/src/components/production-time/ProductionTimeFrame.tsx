import { cn } from "@beyo/lib";
import { SectionLabel } from "@beyo/ui";

export type ProductionTimeFrameProps = {
  children: React.ReactNode;
  /**
   * Sits at the end of the section-label row. Optional because two callers have
   * nothing to put there: the skeleton, which has no view model yet, and the
   * section's error state, which has no figures to restate.
   */
  labelTrailing?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * The card shell: section label outside, hairline-bordered surface inside.
 *
 * Deliberately not `ContentCard` — both host pages already render this widget
 * inside one, and nesting two would double the padding and lose the dividers
 * the row list needs.
 */
export function ProductionTimeFrame({
  children,
  labelTrailing,
  className,
  "data-testid": testId,
}: ProductionTimeFrameProps): React.JSX.Element {
  return (
    <section className={cn("mt-7 flex flex-col gap-3", className)}>
      {/* `min-h-9` reserves the trailing control's height whether or not one is
        * rendered: the skeleton and the error frame cannot know the order's
        * quantity, so without the reservation the header would grow by 16px the
        * moment a multi-piece card replaced them. */}
      <div className="flex min-h-9 items-center justify-between gap-3">
        <SectionLabel as="h3" tone="muted">
          Production time
        </SectionLabel>
        {labelTrailing}
      </div>
      <div
        className="flex w-full flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card"
        data-testid={testId}
      >
        {children}
      </div>
    </section>
  );
}
