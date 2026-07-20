import type { VisibleTimelineTotals } from "../../lib/time-line-calendar/segment-adapter";

// Mockup format: "4h 47m worked · 19m paused · 59m idle · 2 done" — hours
// are dropped when zero, unlike secondsToHM.
function compactDuration(totalSeconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(totalSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export type TimelineTotalsStripProps = {
  totals: VisibleTimelineTotals;
};

// Visible-range totals band under the header (derived from the on-screen
// dates' slices, NOT the response's whole-window totals).
export function TimelineTotalsStrip({
  totals,
}: TimelineTotalsStripProps): React.JSX.Element {
  const entries: { value: string; label: string }[] = [
    { value: compactDuration(totals.workingSeconds), label: "worked" },
    { value: compactDuration(totals.pauseSeconds), label: "paused" },
    { value: compactDuration(totals.idleSeconds), label: "idle" },
    { value: String(totals.completedCount), label: "done" },
  ];

  return (
    <div
      className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5"
      data-testid="timeline-totals-strip"
    >
      {entries.map((entry) => (
        <p key={entry.label} className="min-w-0 truncate text-xs">
          <strong className="font-semibold tabular-nums text-foreground">
            {entry.value}
          </strong>{" "}
          <span className="text-muted-foreground">{entry.label}</span>
        </p>
      ))}
    </div>
  );
}
