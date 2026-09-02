import type { TypicalStrategyTone } from "../../lib/typical-strategy";

/**
 * Three readings of one question: how close is the history behind this number
 * to the item in front of you?
 *
 * Deliberately not the state palette — this is a confidence signal, not a
 * status, and borrowing `success`/`danger` would read as "the budget is fine"
 * or "something is wrong" when neither is what a basis says.
 */
export const TYPICAL_STRATEGY_PILL_CLASS: Record<TypicalStrategyTone, string> = {
  narrow: "bg-[#eef4fd] text-[#2f6fd0]",
  broad: "bg-muted text-muted-foreground",
  weak: "bg-[#fdf6e8] text-[#8a6a1f]",
};
