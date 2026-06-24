import type { ItemCategoryPickerOption } from "./types/picker";

export const ITEM_CATEGORY_PICKER_SURFACE_ID = "item-category-picker";

export type ItemCategoryPickerSurfaceProps = {
  majorCategory: string;
  categories: ItemCategoryPickerOption[];
  currentCategoryId: string | null | undefined;
  onSelect: (categoryId: string) => void;
};
