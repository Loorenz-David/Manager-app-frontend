import { resolvePricingQuantity } from "../../lib/item-pricing";
import { ItemExpectedSalePriceField } from "./ItemExpectedSalePriceField";
import { ItemPurchasePriceDisplay } from "./ItemPurchasePriceDisplay";

export type ItemPricingFieldGroupProps = {
  /** `"seat"` | `"wood"` | nothing chosen yet. */
  majorCategory: string | null | undefined;
  quantity: number | null | undefined;
};

/**
 * Both pricing inputs, and the rules about when they appear.
 *
 * `majorCategory` and `quantity` arrive as props rather than being watched, so
 * this package carries no assumption about the host form's field names — the
 * same reason `UpholsteryFieldGroup` takes its quantity.
 */
export function ItemPricingFieldGroup({
  majorCategory,
  quantity,
}: ItemPricingFieldGroupProps): React.JSX.Element | null {
  // Nothing to price until a category is chosen — the rules below depend on it.
  if (!majorCategory) {
    return null;
  }

  const resolvedQuantity = resolvePricingQuantity(quantity);
  // Seats normally expose quantity, but a purchase lookup can also supply a
  // real multi-piece wood lot. Whenever quantity changes the saved total, show
  // that multiplication rather than presenting the per-piece figure as total.
  const showTotal = majorCategory === "seat" || resolvedQuantity > 1;

  return (
    <div className="flex flex-col gap-5" data-testid="item-pricing-field-group">
      <ItemPurchasePriceDisplay
        quantity={resolvedQuantity}
        showTotal={showTotal}
      />
      <ItemExpectedSalePriceField
        quantity={resolvedQuantity}
        showTotal={showTotal}
      />
    </div>
  );
}
