import { cn } from "@beyo/lib";

import {
  PRICE_EDITOR_TONE_FILL,
  type PriceEditorTone,
} from "./price-editor-tone";

export type PriceSliderProps = {
  /** Handle position ∈ [0, 1]. May be off-grid; emissions are always on-grid. */
  fraction: number;
  /** Number of steps in the band; emissions are k / stepCount for integer k. */
  stepCount: number;
  /** Called with an on-grid fraction on every drag/keyboard move. */
  onFractionChange: (fraction: number) => void;
  tone: PriceEditorTone;
  /** Suggested-price marker position ∈ [0, 1]; null hides marker and label. */
  markerFraction: number | null;
  /** "suggested 2 025/piece" */
  markerLabel: string | null;
  /** "700/piece" */
  minLabel: string;
  /** "2 750/piece" */
  maxLabel: string;
  disabled?: boolean;
  /** Shown under the track when disabled — never disable without a reason. */
  disabledReason?: string | null;
  /**
   * What assistive tech announces instead of the raw step index — the formatted
   * per-piece price. Post-approval amendment (phase-2 fold-back, 2026-08-20).
   */
  ariaValueText?: string | null;
};

function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * The price slider: a visually-hidden native `input[type=range]` drives a
 * styled track/fill/handle, so drag, tap, keyboard and a11y come from the
 * platform (projection L9). The component speaks only fractions — snapping a
 * fraction to a price is the consumer's job (intention §4A M6).
 */
export function PriceSlider({
  fraction,
  stepCount,
  onFractionChange,
  tone,
  markerFraction,
  markerLabel,
  minLabel,
  maxLabel,
  disabled = false,
  disabledReason = null,
  ariaValueText = null,
}: PriceSliderProps): React.JSX.Element {
  const steps = Math.max(1, Math.round(stepCount));
  const handleFraction = clampFraction(fraction);
  const inputValue = Math.round(handleFraction * steps);
  const marker = markerFraction === null ? null : clampFraction(markerFraction);

  function emitIndex(index: number): void {
    const next = Math.min(steps, Math.max(0, index));
    onFractionChange(next / steps);
  }

  // The native input handles arrows in real browsers but jsdom does not, so
  // the keyboard step is explicit and the default is suppressed to avoid a
  // double step in browsers (phase-1 plan, criterion 53).
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      emitIndex(inputValue - 1);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      emitIndex(inputValue + 1);
    }
  }

  return (
    <div
      className={cn("flex flex-col gap-2", disabled && "opacity-60")}
      data-testid="item-valuation-slider"
    >
      {markerLabel !== null && marker !== null ? (
        <div className="relative h-5">
          <p
            className="absolute -translate-x-1/2 whitespace-nowrap text-sm font-semibold text-foreground"
            style={{ left: `${marker * 100}%` }}
          >
            {markerLabel}
          </p>
        </div>
      ) : null}

      <div className="relative flex h-9 items-center">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e8e8ec]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${handleFraction * 100}%`,
              backgroundColor: PRICE_EDITOR_TONE_FILL[tone],
            }}
          />
        </div>

        {marker !== null ? (
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-7 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-foreground"
            data-testid="item-valuation-suggested-marker"
            style={{ left: `${marker * 100}%` }}
          />
        ) : null}

        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md"
          data-testid="item-valuation-slider-handle"
          style={{ left: `${handleFraction * 100}%` }}
        >
          –
        </span>

        <input
          type="range"
          aria-label="Expected sold price"
          aria-valuetext={ariaValueText ?? undefined}
          className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          data-testid="item-valuation-slider-input"
          disabled={disabled}
          max={steps}
          min={0}
          step={1}
          value={inputValue}
          onChange={(event) => emitIndex(Number(event.target.value))}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="flex items-center justify-between font-mono text-sm text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>

      {disabled && disabledReason ? (
        <p
          className="text-center text-sm text-muted-foreground"
          data-testid="item-valuation-slider-reason"
        >
          {disabledReason}
        </p>
      ) : null}
    </div>
  );
}
