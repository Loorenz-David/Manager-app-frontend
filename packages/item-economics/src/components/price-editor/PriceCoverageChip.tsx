import { TriangleAlert } from "lucide-react";
import { cn } from "@beyo/lib";

import {
  PRICE_EDITOR_TONE_CHIP,
  type PriceEditorTone,
} from "./price-editor-tone";

export type PriceCoverageChipProps = {
  /** "Covers typical work" / "Below typical work" — authored upstream. */
  label: string;
  tone: PriceEditorTone;
  /**
   * The infeasible state: this price funds no work at all, rather than merely
   * less than the typical. Same red as any shortfall — the icon and the label
   * are what separate "you are under" from "there is nothing here".
   */
  isWarning?: boolean;
};

/** The coverage pill under the headline. Render only when the anchors allow a chip. */
export function PriceCoverageChip({
  label,
  tone,
  isWarning = false,
}: PriceCoverageChipProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold",
        PRICE_EDITOR_TONE_CHIP[tone],
      )}
      data-testid="item-valuation-chip"
      data-tone={tone}
      data-warning={isWarning ? "true" : undefined}
    >
      {isWarning ? (
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
      ) : null}
      {label}
    </span>
  );
}
