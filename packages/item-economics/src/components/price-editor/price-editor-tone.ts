/**
 * The price editor's tone vocabulary — deliberately its own three-value union
 * rather than `ProductionTimeTone`: coverage is a judgement about one draft
 * price, not a section state. The hex values reuse the production-time palette
 * so the two money widgets cannot drift apart visually.
 *
 * Registered in master plan §6 (projection L22); consumed by phase 2's
 * controller as the only tone type the components accept.
 */
export type PriceEditorTone = "positive" | "negative" | "neutral";

/** Text colour per tone — matches StatePill's success/danger text. */
export const PRICE_EDITOR_TONE_TEXT: Record<PriceEditorTone, string> = {
  positive: "text-[#1e7a46]",
  negative: "text-[#b9382a]",
  neutral: "text-foreground",
};

/** Chip surface per tone. */
export const PRICE_EDITOR_TONE_CHIP: Record<PriceEditorTone, string> = {
  positive: "bg-[#eaf5ee] text-[#1e7a46]",
  negative: "bg-[#fbeeec] text-[#b9382a]",
  neutral: "bg-muted text-muted-foreground",
};

/** Slider fill per tone — saturated counterparts of the text colours. */
export const PRICE_EDITOR_TONE_FILL: Record<PriceEditorTone, string> = {
  positive: "#4f9d69",
  negative: "#c2503f",
  neutral: "var(--color-border)",
};
