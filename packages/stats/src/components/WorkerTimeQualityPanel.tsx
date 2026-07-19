import { memo } from "react";
import { TriangleAlert } from "lucide-react";

import { FILL_MODE_LABEL, NO_FILL, type TimeFillMode } from "../lib/time-quality";

// Time-quality diagnostics for the granularity page, below the totals selector.
// Three columns mirroring WorkerTotalsSelector's grid: flagged-step count,
// wasted time, and the estimated fill for the selected strategy. Tapping the
// fill column cycles the strategy (median → mean → iqr). The wasted/fill
// values follow the active intention's state; they are hidden (em dash) while
// the `completed` intention is active — completed carries no time state.
export type WorkerTimeQualityPanelProps = {
  flaggedCount: number;
  // null → value hidden ("—"): the completed intention has no time state, and
  // the fill is also blank under the `none` mode (nothing is being added).
  wastedDisplay: string | null;
  fillDisplay: string | null;
  mode: TimeFillMode;
  // Cycling stays enabled under `none` — the control must never strand the
  // user in a mode they cannot leave. Disabled only where there is no state.
  canCycle: boolean;
  onCycleStrategy: () => void;
};

export const WorkerTimeQualityPanel = memo(function WorkerTimeQualityPanel({
  flaggedCount,
  wastedDisplay,
  fillDisplay,
  mode,
  canCycle,
  onCycleStrategy,
}: WorkerTimeQualityPanelProps): React.JSX.Element {

  return (
    <div
      className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl border border-[#f0c36a] bg-card shadow-sm"
      data-testid="worker-time-quality-panel"
    >
      <div className="flex min-w-0 flex-col items-center px-2 py-3 text-center">
        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#8a5a00]">
          <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          Flagged
        </span>
        <strong
          className="mt-1 text-sm font-semibold tracking-tight text-foreground"
          data-testid="worker-time-quality-flagged"
        >
          {flaggedCount}
        </strong>
      </div>

      <div className="flex min-w-0 flex-col items-center px-2 py-3 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Wasted
        </span>
        <strong
          className="mt-1 text-sm font-semibold tracking-tight text-foreground tabular-nums"
          data-testid="worker-time-quality-wasted"
        >
          {wastedDisplay ?? "—"}
        </strong>
      </div>

      <button
        aria-label={`Fill, ${FILL_MODE_LABEL[mode]}. Tap to change how the estimate is applied`}
        className={`flex min-w-0 flex-col items-center px-2 py-3 text-center transition-colors ${
          canCycle ? "cursor-pointer active:bg-muted" : "cursor-default"
        }`}
        data-testid="worker-time-quality-fill"
        disabled={!canCycle}
        type="button"
        onClick={onCycleStrategy}
      >
        <span className="inline-flex min-w-0 items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Fill
          <span
            className={`truncate ${mode === NO_FILL ? "text-muted-foreground" : "text-[#1f5ea8]"}`}
            data-testid="worker-time-quality-strategy"
          >
            {FILL_MODE_LABEL[mode]}
          </span>
        </span>
        <strong
          className="mt-1 text-sm font-semibold tracking-tight text-foreground tabular-nums"
          data-testid="worker-time-quality-fill-value"
        >
          {fillDisplay ?? "—"}
        </strong>
      </button>
    </div>
  );
});
