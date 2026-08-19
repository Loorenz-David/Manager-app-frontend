import { ITEM_PRICING_FIELD_NAMES } from "../../pricing-fields";
import { ItemPricingNumberField } from "./ItemPricingNumberField";

export type ItemExpectedSalePriceFieldProps = {
  quantity: number;
  showTotal: boolean;
};

/**
 * What the item is expected to sell for. Feeds `item.expected_sale_price_minor`
 * — and, on a pre-order, the Shopify product's price too: they are the same
 * number, which is why the form collects it once.
 */
export function ItemExpectedSalePriceField({
  quantity,
  showTotal,
}: ItemExpectedSalePriceFieldProps): React.JSX.Element {
  return (
    <ItemPricingNumberField
      label="Expected sale price"
      name={ITEM_PRICING_FIELD_NAMES.expectedSalePrice}
      perPieceLabel="Expected sale price per piece"
      placeholder="e.g. 4000"
      quantity={quantity}
      showTotal={showTotal}
      testId="item-expected-sale-price"
    />
  );
}
