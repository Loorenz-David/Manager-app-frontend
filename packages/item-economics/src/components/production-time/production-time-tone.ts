import type { StatePillVariant } from "@beyo/ui";

import type { ProductionTimeTone } from "../../lib/production-time-view-model";

/**
 * Text tones reuse the StatePill variants so the widget cannot drift from the
 * state colours used everywhere else in the app. The fills are the saturated
 * counterparts, for the segments and swatches.
 */
export const PRODUCTION_TIME_TONE_VARIANT: Record<
  ProductionTimeTone,
  StatePillVariant
> = {
  completed: "success",
  working: "active",
  paused: "warning",
  blocked: "danger",
  pending: "neutral",
  excluded: "neutral",
};

export const PRODUCTION_TIME_TONE_FILL: Record<ProductionTimeTone, string> = {
  completed: "#4f9d69",
  working: "#7fa8ef",
  paused: "#e0b13c",
  blocked: "#d9695c",
  pending: "var(--color-border)",
  // An excluded section consumed no slice — an outlined swatch, not a filled one.
  excluded: "transparent",
};

/** Matches StatePill's `success` / `danger` text colours. */
export const PRODUCTION_TIME_SUCCESS_TEXT = "text-[#1e7a46]";
export const PRODUCTION_TIME_DANGER_TEXT = "text-[#b9382a]";

/** Body copy inside a danger container — reads as prose, not as a second alarm. */
export const PRODUCTION_TIME_DANGER_BODY_TEXT = "text-[#8f4038]";
/** The soft danger container shared by the outlook line and the infeasible notice. */
export const PRODUCTION_TIME_DANGER_SURFACE = "bg-[#fff3f1]";

/** The active row's highlight and its left accent rule. */
export const PRODUCTION_TIME_ACTIVE_ROW_BG = "bg-[#f5f9ff]";
export const PRODUCTION_TIME_ACTIVE_ROW_ACCENT = "bg-[#2f6fd0]";

/** The unconsumed tail of the budget bar. */
export const PRODUCTION_TIME_REMAINDER_HATCH =
  "repeating-linear-gradient(45deg, var(--color-border) 0 3px, transparent 3px 6px)";
