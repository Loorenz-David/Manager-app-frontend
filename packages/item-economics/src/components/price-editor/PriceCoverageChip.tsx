import { cn } from "@beyo/lib";

import {
  PRICE_EDITOR_TONE_CHIP,
  type PriceEditorTone,
} from "./price-editor-tone";

export type PriceCoverageChipProps = {
  /** "Covers typical work" / "Below typical work" — authored upstream. */
  label: string;
  tone: PriceEditorTone;
};

/** The coverage pill under the headline. Render only when the anchors allow a chip. */
export function PriceCoverageChip({
  label,
  tone,
}: PriceCoverageChipProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-4 py-1.5 text-sm font-semibold",
        PRICE_EDITOR_TONE_CHIP[tone],
      )}
      data-testid="item-valuation-chip"
      data-tone={tone}
    >
      {label}
    </span>
  );
}
