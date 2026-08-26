import { TriangleAlert } from "lucide-react";
import { cn } from "@beyo/lib";

import type { ProductionTimeOutlookViewModel } from "../../lib/production-time-view-model";
import {
  PRODUCTION_TIME_DANGER_SURFACE,
  PRODUCTION_TIME_DANGER_TEXT,
} from "./production-time-tone";

export type ProductionTimeOutlookProps = {
  outlook: ProductionTimeOutlookViewModel;
};

/**
 * One sentence, under the bar, only when the unfinished sections' targets no
 * longer fit in what is left of the pot. It reads as a footnote to the summary
 * above it rather than a fourth headline figure. Its soft alert container
 * makes the forecast easy to scan without competing with the headline.
 */
export function ProductionTimeOutlook({
  outlook,
}: ProductionTimeOutlookProps): React.JSX.Element {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-lg border border-current px-3 py-2 text-xs leading-5",
        PRODUCTION_TIME_DANGER_SURFACE,
        PRODUCTION_TIME_DANGER_TEXT,
      )}
      data-testid="production-time-outlook"
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{outlook.label}</span>
    </p>
  );
}
