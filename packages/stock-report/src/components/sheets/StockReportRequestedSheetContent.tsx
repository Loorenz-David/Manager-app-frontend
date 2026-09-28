import { useState } from "react";
import { Undo2 } from "lucide-react";
import { z } from "zod";

import { NumberInput } from "@beyo/ui";

import type { StockReportRequestedSource } from "../../stock-report.types";

/** v8 §5.22's request validation, mirrored: a whole number, zero or more. */
export const StockRequestedQuantitySchema = z.number().int().min(0);

export type StockReportRequestedSheetContentProps = {
  /** The effective requested quantity the row shows today. */
  current: number;
  source: StockReportRequestedSource;
  /** What Scanner says, shown beside a typed value. */
  scanner: number;
  disabled?: boolean;
  onSave: (value: number) => void;
  onBackToLive: () => void;
};

/**
 * The requested-quantity sheet (plan §G.7, OC-10): a number field prefilled
 * with the row's requested count and two buttons — back to Scanner's value
 * (v8 §5.22 `null`) or save the typed one. On a Scanner row, saving the shown
 * number **pins** it (v9 §5.22), so Save is enabled there even unchanged; on a
 * typed row an unchanged value has nothing to save.
 */
export function StockReportRequestedSheetContent({
  current,
  source,
  scanner,
  disabled = false,
  onSave,
  onBackToLive,
}: StockReportRequestedSheetContentProps): React.JSX.Element {
  const [value, setValue] = useState<number | null>(current);
  const parsed = StockRequestedQuantitySchema.safeParse(value);
  const canSave = parsed.success && !(source === "manual" && parsed.data === current);

  return (
    <div className="flex flex-col gap-3 px-4 pb-4" data-testid="stock-report-requested-sheet">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-muted-foreground" htmlFor="stock-report-requested-input">
          Requested quantity
        </label>
        <span className="text-xs font-medium text-muted-foreground" data-testid="stock-report-requested-source">
          {source === "manual" ? "typed by hand" : `from Scanner: ${scanner}`}
        </span>
      </div>

      <NumberInput
        disabled={disabled}
        id="stock-report-requested-input"
        inputMode="numeric"
        inputTestId="stock-report-requested-input"
        min={0}
        step={1}
        unitLabel="units"
        value={value}
        onValueChange={(next) => setValue(next)}
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-primary disabled:opacity-50"
          data-testid="stock-report-requested-back-to-live"
          disabled={disabled || source === "scanner"}
          type="button"
          onClick={onBackToLive}
        >
          <Undo2 aria-hidden="true" className="size-4 shrink-0" />
          Back to live
        </button>
        <button
          className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-card disabled:opacity-50"
          data-testid="stock-report-requested-save"
          disabled={disabled || !canSave}
          type="button"
          onClick={() => {
            if (parsed.success) onSave(parsed.data);
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
