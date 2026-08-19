import type { ValuationCurrency } from "../types";
import { INLINE_PRICING_CURRENCY, resolvePricingQuantity } from "./item-pricing";

/**
 * Currency and per-piece display for the expected sold price editor
 * (intention §4A M11/M12).
 */

/**
 * A `Record` rather than a switch: exhaustiveness is enforced by construction,
 * so a fourth currency fails the typecheck here instead of quietly rendering as
 * SEK anywhere the mapping is missing.
 */
const CURRENCY_DISPLAY_CODE: Record<ValuationCurrency, string> = {
  swedish_krona: "SEK",
  danish_krona: "DKK",
  euro: "EUR",
};

/**
 * `currency` is null only before the first pricing. The code then shows the
 * inline-pricing currency, because that is what the purchase-price bootstrap
 * wrote and what Save will price in.
 */
export function currencyDisplayCode(
  currency: ValuationCurrency | null,
): string {
  return CURRENCY_DISPLAY_CODE[currency ?? INLINE_PRICING_CURRENCY];
}

// Swedish grouping is fixed rather than device-derived: the price is in the
// workspace's currency regardless of the phone's locale. The group separator
// this produces is U+00A0, not an ASCII space.
const perPieceFormatter = new Intl.NumberFormat("sv-SE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Whole-item minor units → the per-piece display value. Display only — the
 * stored draft is never replaced by a re-parse of its own rendering.
 *
 * The divisor is `max(1, quantity)`: `items.quantity` has no database
 * constraint behind it and a row written before the validators existed can hold
 * `0` (handoff §8.2). `resolvePricingQuantity` is that rule's single home.
 */
export function formatPerPiece(minor: number, quantity: number): string {
  return perPieceFormatter.format(minor / (100 * resolvePricingQuantity(quantity)));
}
