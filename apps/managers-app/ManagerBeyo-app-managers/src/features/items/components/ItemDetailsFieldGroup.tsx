import { ItemCurrencyField } from './fields/ItemCurrencyField';
import { ItemDesignerField } from './fields/ItemDesignerField';
import { ItemIdentityField } from './fields/ItemIdentityField';
import { ItemPositionField } from './fields/ItemPositionField';
import { ItemQuantityField } from './fields/ItemQuantityField';

export function ItemDetailsFieldGroup() {
  return (
    <div className="flex flex-col gap-4" data-testid="item-details-field-group">
      <ItemDesignerField />
      <ItemIdentityField />
      <ItemQuantityField />
      <ItemCurrencyField />
      <ItemPositionField />
    </div>
  );
}
