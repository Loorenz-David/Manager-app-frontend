import { cn } from "@beyo/lib";
import { SectionLabel } from "@beyo/ui";

export type ProductionTimeFrameProps = {
  children: React.ReactNode;
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
  className,
  "data-testid": testId,
}: ProductionTimeFrameProps): React.JSX.Element {
  return (
    <section className={cn("mt-7 flex flex-col gap-3", className)}>
      <SectionLabel as="h3" tone="muted">
        Production time
      </SectionLabel>
      <div
        className="flex w-full flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card"
        data-testid={testId}
      >
        {children}
      </div>
    </section>
  );
}
