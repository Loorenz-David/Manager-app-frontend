/**
 * Pre-order price arithmetic, shared by the price field (which shows the
 * breakdown) and the payload normalizer (which sends the result).
 *
 * The form collects the price of a **single piece**; the Shopify product the
 * pre-order creates is priced at the **total** — `quantity × unit price`. The
 * two must never drift apart, so both sides derive the total from here.
 */

/**
 * `item.quantity` is only editable for seats and is optional in the schema, so
 * everywhere else it stays at the form default of one piece. A missing or
 * non-positive quantity therefore means "one", never "nothing to price".
 */
export const PRE_ORDER_FALLBACK_QUANTITY = 1;

export function resolvePreOrderQuantity(
  quantity: number | null | undefined,
): number {
  return quantity != null && quantity > 0
    ? quantity
    : PRE_ORDER_FALLBACK_QUANTITY;
}

export function resolvePreOrderTotalPrice(
  unitPrice: number | null | undefined,
  quantity: number | null | undefined,
): number | null {
  if (unitPrice == null || !Number.isFinite(unitPrice)) {
    return null;
  }

  // Rounded to whole cents so the float dust of `19.9 * 3` never reaches the
  // display or the decimal string sent to the backend.
  return (
    Math.round(unitPrice * resolvePreOrderQuantity(quantity) * 100) / 100
  );
}

// Swedish grouping ("1 200 kr") is fixed rather than device-derived: the price
// is in kronor regardless of the phone's locale.
const priceFormatter = new Intl.NumberFormat("sv-SE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPreOrderPrice(value: number): string {
  return `${priceFormatter.format(value)} kr`;
}

export function formatPreOrderPieces(quantity: number): string {
  return `${quantity} ${quantity === 1 ? "pc" : "pcs"}`;
}
