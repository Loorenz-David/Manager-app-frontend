import { useMemo } from "react";
import { useTickingElapsed } from "@beyo/lib";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export type TickingTimerProps = {
  startedAtIso: string;
  offsetSeconds?: number;
  className?: string;
  "data-testid"?: string;
};

export function TickingTimer({
  startedAtIso,
  offsetSeconds = 0,
  className,
  "data-testid": testId,
}: TickingTimerProps): React.JSX.Element {
  const startedAtMs = useMemo(
    () => new Date(startedAtIso).getTime(),
    [startedAtIso],
  );
  const elapsed = useTickingElapsed(startedAtMs);

  return (
    <span className={className} data-testid={testId}>
      {formatElapsed(offsetSeconds * 1000 + elapsed)}
    </span>
  );
}
