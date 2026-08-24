import { TriangleAlert } from "lucide-react";
import { cn } from "@beyo/lib";

import type { ProductionTimeOutlookViewModel } from "../../lib/production-time-view-model";
import { PRODUCTION_TIME_WARNING_TEXT } from "./production-time-tone";

export type ProductionTimeOutlookProps = {
  outlook: ProductionTimeOutlookViewModel;
};

/**
 * One sentence, under the bar, only when the unfinished sections' targets no
 * longer fit in what is left of the pot. It reads as a footnote to the summary
 * above it rather than a fourth headline figure — the served numbers stay the
 * loudest thing on the card.
 */
export function ProductionTimeOutlook({
  outlook,
}: ProductionTimeOutlookProps): React.JSX.Element {
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-xs",
        PRODUCTION_TIME_WARNING_TEXT,
      )}
      data-testid="production-time-outlook"
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{outlook.label}</span>
    </p>
  );
}
