/**
 * Track 1A's surface — presentational only. Every prop is a formatted string,
 * a `PriceEditorTone`, a fraction, a boolean or a callback; nothing here
 * imports from `src/lib/` or `src/types.ts` (master plan §9.4, enforced by
 * `boundaries.test.ts`). Phase 2's controller does all formatting.
 *
 * Not re-exported from the package `src/index.ts` in phase 1 — the page
 * composes these from inside the package (projection L16).
 */

export {
  PRICE_EDITOR_TONE_CHIP,
  PRICE_EDITOR_TONE_FILL,
  PRICE_EDITOR_TONE_TEXT,
  type PriceEditorTone,
} from "./price-editor-tone";

export {
  ItemValuationFrame,
  type ItemValuationFrameProps,
} from "./ItemValuationFrame";
export {
  ItemValuationProvenanceRow,
  type ItemValuationProvenanceRowProps,
} from "./ItemValuationProvenanceRow";
export { PriceHeadline, type PriceHeadlineProps } from "./PriceHeadline";
export {
  PriceCoverageChip,
  type PriceCoverageChipProps,
} from "./PriceCoverageChip";
export { PriceSlider, type PriceSliderProps } from "./PriceSlider";
export { WorkImpactTable, type WorkImpactTableProps } from "./WorkImpactTable";
export {
  ItemValuationFooter,
  type ItemValuationFooterProps,
} from "./ItemValuationFooter";
export {
  PurchaseBootstrapCard,
  type PurchaseBootstrapCardProps,
} from "./PurchaseBootstrapCard";
export {
  ItemValuationEmptyState,
  type ItemValuationEmptyStateProps,
} from "./ItemValuationEmptyState";
export { ItemValuationSkeleton } from "./ItemValuationSkeleton";
