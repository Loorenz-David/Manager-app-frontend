import { useTickingElapsed } from "@beyo/lib";

import { secondsToHM } from "../lib/format-duration";

export type WorkerTotalTickerProps = {
  // Live value at `asOfIso` (settled + running).
  offsetSeconds: number;
  // Open-interval count — seconds accrue this fast (can be > 1, e.g. stacked pauses).
  ratePerSecond: number;
  asOfIso: string;
  className?: string;
  "data-testid"?: string;
};

// Renders a day total in "Xh Ym" that advances live off the shared 1s clock:
// display = offsetSeconds + ratePerSecond × elapsedSince(asOf). The text only
// changes on minute rollovers, but re-render is cheap (one app-wide interval).
export function WorkerTotalTicker({
  offsetSeconds,
  ratePerSecond,
  asOfIso,
  className,
  "data-testid": testId,
}: WorkerTotalTickerProps): React.JSX.Element {
  const elapsedMs = useTickingElapsed(Date.parse(asOfIso));
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  return (
    <span className={className} data-testid={testId}>
      {secondsToHM(offsetSeconds + ratePerSecond * elapsedSeconds)}
    </span>
  );
}
