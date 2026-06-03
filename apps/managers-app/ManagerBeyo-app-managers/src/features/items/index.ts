export { ItemDetailsFieldGroup } from './components/ItemDetailsFieldGroup';
export { ItemCategorySelectionField } from './components/fields/ItemCategorySelectionField';
export { ItemCurrencyField } from './components/fields/ItemCurrencyField';
export { ItemDesignerField } from './components/fields/ItemDesignerField';
export { ItemIdentityField } from './components/fields/ItemIdentityField';
export { ItemPositionField } from './components/fields/ItemPositionField';
export { ItemQuantityField } from './components/fields/ItemQuantityField';
export { ItemUpholsteryAmountField } from './components/fields/ItemUpholsteryAmountField';
export { ItemUpholsteryField } from './components/fields/ItemUpholsteryField';
export { useCreateItemUpholstery } from './actions/use-create-item-upholstery';
export { useSetUpholsteryQuantity } from './actions/use-set-upholstery-quantity';
export { useUpdateItemUpholstery } from './actions/use-update-item-upholstery';
export { useUpdateItem } from './actions/use-update-item';
export { useItemCategoryPickerFlow } from './flows/use-item-category-picker.flow';
export { itemSurfaces, preloadItemCategoryPickerSurface } from './surfaces';
export { useItemCategorySelectionStore } from './store/item-category-selection.store';

export { ItemDetailsFieldsSchema } from './types';
export { IssueCategoryConfigSchema, ItemCategoryPickerOptionSchema } from './types';
export { ItemIssuesFieldSchema, ItemIssuesFieldsSchema } from './types';
export { ItemUpholsteryFieldsSchema } from './types';
export type {
  CreateItemInput,
  IssueCategoryConfig,
  Item,
  ItemCategoryPickerOption,
  ItemCurrency,
  ItemDetailsFields,
  ItemUpholsteryRequirement,
  ItemUpholsteryRequirementState,
  ItemIssuesFields,
  ItemUpholsteryFields,
  ItemViewModel,
  ListItemCategoriesPickerParams,
  ListIssueCategoryConfigsParams,
  ListItemsParams,
  UpdateItemInput,
} from './types';
export type { ItemIssueFieldEntry } from './types';
export type { ItemId } from '@/types/common';
