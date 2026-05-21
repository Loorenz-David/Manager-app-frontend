import { ItemArticleNumberField } from './fields/ItemArticleNumberField';
import { ItemCurrencyField } from './fields/ItemCurrencyField';
import { ItemDesignerField } from './fields/ItemDesignerField';
import { ItemPositionField } from './fields/ItemPositionField';
import { ItemQuantityField } from './fields/ItemQuantityField';
import { ItemSkuField } from './fields/ItemSkuField';

export function ItemDetailsFieldGroup() {
  return (
    <div className="flex flex-col gap-4" data-testid="item-details-field-group">
      <ItemDesignerField />
      <div className="grid grid-cols-2 gap-3">
        <ItemArticleNumberField />
        <ItemSkuField />
      </div>
      <ItemQuantityField />
      <ItemCurrencyField />
      <ItemPositionField />
    </div>
  );
}
