import { z } from "zod";

/**
 * The two inline pricing inputs, composed into a host form as `item_pricing`
 * (the same way `@beyo/upholstery` contributes `item_upholstery`).
 *
 * Values are **per piece, in kronor as typed**. The conversion to the integer
 * minor-unit totals the backend wants happens at submit, via
 * `resolveTotalMinor` in `lib/item-pricing.ts`.
 *
 * Both are optional by owner decision — a purchase price is often simply not
 * known when a task is created — so neither carries a required rule here or in
 * the host form's `superRefine`. `null` means "not filled in" and must never be
 * submitted as `0`.
 *
 * `purchase_cost_per_piece` is lookup-owned and read-only: it has no field-error
 * renderer. Every ingestion point must therefore reject negative or non-finite
 * values before writing this schema path, or whole-form validation can create
 * an error the user has no control to correct.
 */
export const ItemPricingFieldsSchema = z.object({
  purchase_cost_per_piece: z
    .number({ message: "Enter a number." })
    .nonnegative("Enter a price of zero or more.")
    .nullable(),
  expected_sale_price_per_piece: z
    .number({ message: "Enter a number." })
    .nonnegative("Enter a price of zero or more.")
    .nullable(),
});
export type ItemPricingFields = z.infer<typeof ItemPricingFieldsSchema>;

/** The form values a host provides for a task that has not been priced yet. */
export const EMPTY_ITEM_PRICING_FIELDS: ItemPricingFields = {
  purchase_cost_per_piece: null,
  expected_sale_price_per_piece: null,
};

export const ITEM_PRICING_FIELD_NAMES = {
  purchaseCost: "item_pricing.purchase_cost_per_piece",
  expectedSalePrice: "item_pricing.expected_sale_price_per_piece",
} as const;
