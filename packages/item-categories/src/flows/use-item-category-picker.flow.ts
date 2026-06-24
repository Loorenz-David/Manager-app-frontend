import { useEffect } from "react";

import { useItemCategoriesPickerQuery } from "../api/use-item-categories-picker-query";
import { useItemCategorySelectionStore } from "../store/item-category-selection.store";

export function useItemCategoryPickerFlow() {
  const options = useItemCategorySelectionStore((state) => state.options);
  const setOptions = useItemCategorySelectionStore((state) => state.setOptions);

  const { data, isPending } = useItemCategoriesPickerQuery(
    {},
    { enabled: options.length === 0 },
  );

  useEffect(() => {
    if (data?.itemCategories && options.length === 0) {
      setOptions(data.itemCategories);
    }
  }, [data, options.length, setOptions]);

  const resolvedOptions = options.length > 0 ? options : (data?.itemCategories ?? []);

  const byMajorCategory = resolvedOptions.reduce<
    Record<string, typeof resolvedOptions>
  >((acc, option) => {
    acc[option.major_category] = [...(acc[option.major_category] ?? []), option];
    return acc;
  }, {});

  return {
    options: resolvedOptions,
    byMajorCategory,
    isPending: isPending && options.length === 0,
  };
}
