import { useItemCategoriesQuery } from "../api/use-item-categories-query";
import type { ItemCategoryId, ItemCategoryViewModel } from "../types";
import { toItemCategoryViewModel } from "../types";

export type ItemCategoryByIdResult = {
  category: ItemCategoryViewModel | null;
  isPending: boolean;
  isError: boolean;
};

export function useItemCategoryByIdFlow(
  id: ItemCategoryId | null | undefined,
): ItemCategoryByIdResult {
  const query = useItemCategoriesQuery();

  const category =
    id && query.data
      ? (query.data.item_categories.find((item) => item.client_id === id) ??
        null)
      : null;

  return {
    category: category ? toItemCategoryViewModel(category) : null,
    isPending: query.isPending,
    isError: query.isError,
  };
}
