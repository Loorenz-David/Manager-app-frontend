import { resolvePricingQuantity } from "../../lib/item-pricing";
import { ItemExpectedSalePriceField } from "./ItemExpectedSalePriceField";
import { ItemPricingRefusalNotice } from "./ItemPricingRefusalNotice";
import { ItemPurchasePriceDisplay } from "./ItemPurchasePriceDisplay";

export type ItemPricingFieldGroupProps = {
  /** `"seat"` | `"wood"` | nothing chosen yet. */
  majorCategory: string | null | undefined;
  quantity: number | null | undefined;
  /**
   * Set by the host after task creation was refused for an already-priced item
   * (§9.1), so the explanation sits beside the fields the user has to clear.
   */
  showPricedItemRefusal?: boolean;
  /**
   * Clears both pricing values, offered as the remedy on the refusal notice.
   * The purchase price has no input, so this is the only way a user can empty
   * it and retry.
   */
  onClearPrices?: () => void;
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
  showPricedItemRefusal = false,
  onClearPrices,
}: ItemPricingFieldGroupProps): React.JSX.Element | null {
  // Nothing to price until a category is chosen — the rules below depend on it.
  if (!majorCategory) {
    return null;
  }

  // Seats are the only category with an editable quantity, so they are the only
  // one where a per-piece price differs from the total worth showing.
  const showTotal = majorCategory === "seat";
  const resolvedQuantity = resolvePricingQuantity(quantity);

  return (
    <div className="flex flex-col gap-5" data-testid="item-pricing-field-group">
      {showPricedItemRefusal ? (
        <ItemPricingRefusalNotice onClearPrices={onClearPrices} />
      ) : null}
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
