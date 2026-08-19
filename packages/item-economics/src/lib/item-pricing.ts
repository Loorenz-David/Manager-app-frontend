/**
 * Arithmetic for the inline item pricing collected during task creation.
 *
 * The form collects the price of a **single piece**; the backend is sent the
 * **total** in integer minor units, and the Shopify pre-order product is sent
 * the same total as a kronor decimal string. All three derive from
 * `resolveTotalMinor` so the figure a user sees can never differ from the one
 * that is saved, or from the one the Shopify product carries.
 *
 * Contract: `HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md` §9.
 */

/**
 * The backend requires `item.currency` as soon as either amount is present, and
 * there is no currency picker yet. One constant so the value has a single home
 * when a choice does eventually arrive.
 */
export const INLINE_PRICING_CURRENCY = "swedish_krona";

/**
 * Quantity is only editable for seats — wood items are always a single piece
 * and render no quantity field at all. A missing or non-positive quantity
 * therefore means "one piece", never "nothing to price".
 */
export function resolvePricingQuantity(
  quantity: number | null | undefined,
): number {
  return quantity != null && quantity > 0 ? quantity : 1;
}

/** Kronor as typed → integer minor units (öre) for one piece. */
export function toMinorUnits(perPiece: number): number {
  return Math.round(perPiece * 100);
}

/**
 * The value actually submitted.
 *
 * Rounds to minor units **before** multiplying, deliberately. The alternative —
 * `Math.round(perPiece * quantity * 100)` — can land a krona away from
 * `quantity × the per-piece price shown in the breakdown` on values like
 * `19.99 × 3`, and a total that disagrees with its own arithmetic is a total
 * nobody trusts.
 *
 * Returns `null` for an absent price so "not filled in" never becomes `0`,
 * which is a real price meaning free.
 */
export function resolveTotalMinor(
  perPiece: number | null | undefined,
  quantity: number | null | undefined,
): number | null {
  if (perPiece == null || !Number.isFinite(perPiece)) {
    return null;
  }

  return toMinorUnits(perPiece) * resolvePricingQuantity(quantity);
}

/**
 * The same total as a kronor decimal string, for the Shopify pre-order product.
 * Derived from the minor total rather than recomputed, so the product price and
 * the item's valuation are guaranteed to be the same figure.
 */
export function toMajorUnitString(totalMinor: number): string {
  return (totalMinor / 100).toFixed(2);
}

// Swedish grouping ("1 200 kr") is fixed rather than device-derived: the price
// is in kronor regardless of the phone's locale.
const priceFormatter = new Intl.NumberFormat("sv-SE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Kronor → "1 200 kr". */
export function formatPrice(value: number): string {
  return `${priceFormatter.format(value)} kr`;
}

/** Integer minor units → "4 800 kr". */
export function formatMinorPrice(minor: number): string {
  return formatPrice(minor / 100);
}

export function formatPieces(quantity: number): string {
  return `${quantity} ${quantity === 1 ? "pc" : "pcs"}`;
}
