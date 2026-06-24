import type { ListItemCategoriesPickerParams } from "../types/picker";

export const itemCategoryPickerKeys = {
  all: ["item-categories", "picker"] as const,
  lists: () => [...itemCategoryPickerKeys.all, "list"] as const,
  list: (params: ListItemCategoriesPickerParams = {}) =>
    [...itemCategoryPickerKeys.lists(), params] as const,
};
