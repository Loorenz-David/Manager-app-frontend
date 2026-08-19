import { cn } from "@beyo/lib";

import {
  PRICE_EDITOR_TONE_TEXT,
  type PriceEditorTone,
} from "./price-editor-tone";

export type WorkImpactTableProps = {
  /** "Work on this item" */
  rowLabel: string;
  /** "3h 25m" — null renders `typicalReason` instead, never "0m" (intention §1.3). */
  typical: string | null;
  /** Why the typical column is empty — required whenever `typical` is null. */
  typicalReason: string | null;
  /** Appends an "estimated" marker to a present typical value (handoff §5.1). */
  isTypicalEstimated?: boolean;
  /** "3h 46m" at the draft price — null renders an em dash. */
  atPrice: string | null;
  atPriceTone: PriceEditorTone;
};

/** The TYPICAL / AT PRICE comparison card under the slider. */
export function WorkImpactTable({
  rowLabel,
  typical,
  typicalReason,
  isTypicalEstimated = false,
  atPrice,
  atPriceTone,
}: WorkImpactTableProps): React.JSX.Element {
  return (
    <div
      className="rounded-2xl border border-border bg-card px-5 py-4"
      data-testid="item-valuation-work-table"
    >
      <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-6 gap-y-2">
        <span />
        <span className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Typical
        </span>
        <span className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
          At price
        </span>

        <span className="text-base font-semibold text-foreground">
          {rowLabel}
        </span>
        <span
          className="text-right text-base font-semibold text-foreground"
          data-testid="item-valuation-typical"
        >
          {typical !== null ? (
            <>
              {typical}
              {isTypicalEstimated ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  estimated
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-xs font-normal text-muted-foreground">
              {typicalReason}
            </span>
          )}
        </span>
        <span
          className={cn(
            "text-right text-base font-bold",
            PRICE_EDITOR_TONE_TEXT[atPriceTone],
          )}
          data-testid="item-valuation-at-price"
          data-tone={atPriceTone}
        >
          {atPrice ?? "—"}
        </span>
      </div>
    </div>
  );
}
