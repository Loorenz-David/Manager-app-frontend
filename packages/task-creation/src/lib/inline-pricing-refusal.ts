import { useEffect, useState } from "react";
import type { FieldValues, UseFormWatch } from "react-hook-form";

import { parseErrorIdentity } from "@beyo/item-economics";

export const INLINE_PRICING_REFUSAL_IDENTITY =
  "ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM";

/**
 * Item-economics errors encode their identity at the start of the message.
 * Keep that backend detail out of the form components themselves.
 */
export function isInlinePricingRefusal(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : null;

  return parseErrorIdentity(message) === INLINE_PRICING_REFUSAL_IDENTITY;
}

/** Owns the host-form notice lifecycle without adding a schema escape hatch. */
export function useInlinePricingRefusal<TFieldValues extends FieldValues>(
  watch: UseFormWatch<TFieldValues>,
): {
  showPricedItemRefusal: boolean;
  handleInlinePricingError: (error: unknown) => boolean;
} {
  const [showPricedItemRefusal, setShowPricedItemRefusal] = useState(false);

  useEffect(() => {
    const subscription = watch((_values, { name }) => {
      if (
        name === "item_pricing.purchase_cost_per_piece" ||
        name === "item_pricing.expected_sale_price_per_piece"
      ) {
        setShowPricedItemRefusal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  function handleInlinePricingError(error: unknown): boolean {
    if (!isInlinePricingRefusal(error)) {
      return false;
    }

    setShowPricedItemRefusal(true);
    return true;
  }

  return { showPricedItemRefusal, handleInlinePricingError };
}
