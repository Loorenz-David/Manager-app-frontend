import { useFormContext, useWatch } from "react-hook-form";

import { formatPrice } from "../../lib/item-pricing";
import { ITEM_PRICING_FIELD_NAMES } from "../../pricing-fields";
import { ItemPricingTotalRow } from "./ItemPricingTotalRow";

export type ItemPurchasePriceDisplayProps = {
  quantity: number;
  showTotal: boolean;
};

/**
 * What the workshop paid, shown but not editable.
 *
 * The purchase price is registered in the external purchase system and arrives
 * through the item lookup, so there is no input here — a second, hand-typed
 * figure could disagree with the system of record. The form still carries the
 * value at `item_pricing.purchase_cost_per_piece` (written by the lookup
 * prefill) so the submit path is unchanged.
 */
export function ItemPurchasePriceDisplay({
  quantity,
  showTotal,
}: ItemPurchasePriceDisplayProps): React.JSX.Element {
  const { control } = useFormContext();
  const perPiece = useWatch({
    control,
    name: ITEM_PRICING_FIELD_NAMES.purchaseCost,
  }) as number | null | undefined;

  const hasPrice = perPiece != null && Number.isFinite(perPiece);

  return (
    <div className="flex flex-col gap-2" data-testid="item-purchase-price">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          {showTotal ? "Purchase price per piece" : "Purchase price"}
        </p>
        {hasPrice && !showTotal ? (
          <span
            className="text-[17px] font-semibold tabular-nums"
            data-testid="item-purchase-price-value"
          >
            {formatPrice(perPiece)}
          </span>
        ) : null}
      </div>

      {hasPrice ? (
        showTotal ? (
          <ItemPricingTotalRow
            perPiece={perPiece}
            quantity={quantity}
            testId="item-purchase-price"
          />
        ) : null
      ) : (
        // Phrased to hold both before a lookup has run and after one that
        // carried no price — claiming "not found" would be a guess in the
        // first case.
        <p
          className="text-sm text-muted-foreground"
          data-testid="item-purchase-price-unavailable"
        >
          Not set — this price comes from the purchase system.
        </p>
      )}
    </div>
  );
}
