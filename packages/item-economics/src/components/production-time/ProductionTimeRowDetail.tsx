import { cn } from "@beyo/lib";

import type { ProductionTimeRowDetailViewModel } from "../../lib/production-time-view-model";
import {
  PRODUCTION_TIME_DANGER_TEXT,
  PRODUCTION_TIME_SUCCESS_TEXT,
  PRODUCTION_TIME_TONE_FILL,
} from "./production-time-tone";

export type ProductionTimeRowDetailProps = {
  detail: ProductionTimeRowDetailViewModel;
  typicalLabel: string | null;
};

/**
 * The active row's own bar: worked time against this section's allowance, with
 * a tick marking where the section's typical duration falls, and the server's
 * verdict beneath.
 */
export function ProductionTimeRowDetail({
  detail,
  typicalLabel,
}: ProductionTimeRowDetailProps): React.JSX.Element {
  const isOverShare = detail.verdictTone === "over_share";

  return (
    <div className="flex flex-col gap-1.5" data-testid="production-time-row-detail">
      {/* The track sits inside a taller box so the typical tick can overhang it
       * without being clipped by the track's own rounded overflow. */}
      <div
        aria-hidden="true"
        className="relative h-3 w-full"
        data-testid="production-time-row-progress"
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-muted/40">
          <span
            className="block h-full rounded-full"
            style={{
              width: `${detail.progressPercent}%`,
              backgroundColor: isOverShare
                ? PRODUCTION_TIME_TONE_FILL.blocked
                : PRODUCTION_TIME_TONE_FILL.working,
            }}
          />
        </div>
        {detail.typicalMarkerPercent !== null ? (
          <span
            className="absolute top-0 h-3 w-px bg-foreground/40"
            data-testid="production-time-row-typical-marker"
            style={{ left: `${detail.typicalMarkerPercent}%` }}
          />
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm text-muted-foreground">
          {typicalLabel}
        </span>
        <span
          className={cn(
            "shrink-0 text-sm font-medium",
            isOverShare
              ? PRODUCTION_TIME_DANGER_TEXT
              : PRODUCTION_TIME_SUCCESS_TEXT,
          )}
          data-testid="production-time-row-verdict"
        >
          {detail.verdictLabel}
        </span>
      </div>
    </div>
  );
}
