import { useQuery } from '@tanstack/react-query';

import type { ListItemCategoriesPickerParams } from '../types';
import { fetchItemCategoriesPicker } from './fetch-item-categories-picker';
import { itemCategoryPickerKeys } from './item-category-picker-keys';

export function useItemCategoriesPickerQuery(
  params: ListItemCategoriesPickerParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: itemCategoryPickerKeys.list(params),
    queryFn: () => fetchItemCategoriesPicker(params),
    enabled: options.enabled ?? true,
  });
}
