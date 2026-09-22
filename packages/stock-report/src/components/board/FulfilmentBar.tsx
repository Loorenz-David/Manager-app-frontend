import { cn } from "@beyo/lib";

import {
  BAR_TRACK_CLASS,
  SEGMENT_FILL_CLASS,
  SEGMENT_INK_CLASS,
} from "../../lib/stock-report-theme";
import { computeFulfilmentSegments } from "../../lib/fulfilment-bar";
import type { FulfilmentQuantities } from "../../lib/fulfilment-bar";

export type FulfilmentBarSize = "card" | "summary";

export type FulfilmentBarProps = {
  quantities: FulfilmentQuantities;
  /** 20 px on a list card, 22 px in the detail summary. */
  size?: FulfilmentBarSize;
  className?: string;
  "data-testid"?: string;
};

// h-5 is 20px and h-[22px] is the summary height the design calls for; no
// spacing token lands on 22px.
const TRACK_HEIGHT_CLASS: Record<FulfilmentBarSize, string> = {
  card: "h-5",
  summary: "h-[22px]",
};

const SEGMENT_CLASS =
  "flex h-full shrink-0 grow-0 items-center justify-center overflow-hidden text-[11px] font-bold leading-none";

export function FulfilmentBar({
  quantities,
  size = "card",
  className,
  "data-testid": testId,
}: FulfilmentBarProps): React.JSX.Element {
  const segments = computeFulfilmentSegments(quantities);

  return (
    <div
      className={cn(
        "flex w-full overflow-hidden rounded-md",
        BAR_TRACK_CLASS,
        TRACK_HEIGHT_CLASS[size],
        className,
      )}
      data-testid={testId}
    >
      {segments.fulfilled ? (
        <span
          className={cn(SEGMENT_CLASS, SEGMENT_FILL_CLASS.fulfilled, SEGMENT_INK_CLASS.fulfilled)}
          data-testid={testId ? `${testId}-fulfilled` : undefined}
          style={{ width: `${segments.fulfilled.widthPercent}%` }}
        >
          {segments.fulfilled.value}
        </span>
      ) : null}

      {segments.inProgress ? (
        <span
          className={cn(
            SEGMENT_CLASS,
            SEGMENT_FILL_CLASS.inProgress,
            SEGMENT_INK_CLASS.inProgress,
          )}
          data-testid={testId ? `${testId}-in-progress` : undefined}
          style={{ width: `${segments.inProgress.widthPercent}%` }}
        >
          {segments.inProgress.value}
        </span>
      ) : null}

      {segments.inQueue ? (
        <span
          className={cn(SEGMENT_CLASS, SEGMENT_FILL_CLASS.inQueue, SEGMENT_INK_CLASS.inQueue)}
          data-testid={testId ? `${testId}-in-queue` : undefined}
          style={{ width: `${segments.inQueue.widthPercent}%` }}
        >
          {segments.inQueue.value}
        </span>
      ) : null}

      {segments.remaining ? (
        <span
          className={cn(
            "flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden text-[11px] font-bold leading-none",
            SEGMENT_INK_CLASS.remaining,
          )}
          data-testid={testId ? `${testId}-remaining` : undefined}
        >
          {segments.remaining.value}
        </span>
      ) : null}
    </div>
  );
}
