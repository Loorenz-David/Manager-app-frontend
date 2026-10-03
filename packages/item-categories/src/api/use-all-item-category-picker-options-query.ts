import { useQuery } from "@tanstack/react-query";
import { fetchItemCategoriesPicker } from "./fetch-item-categories-picker";
import { itemCategoryPickerKeys } from "./item-category-picker-keys";

export function useAllItemCategoryPickerOptionsQuery() {
  return useQuery({
    queryKey: [...itemCategoryPickerKeys.lists(), "all-pages"],
    queryFn: async () => {
      const categories = [] as Awaited<ReturnType<typeof fetchItemCategoriesPicker>>["itemCategories"];
      let offset = 0;
      for (;;) {
        const page = await fetchItemCategoriesPicker({ limit: 200, offset });
        categories.push(...page.itemCategories);
        if (!page.itemCategoriesPagination.has_more) return categories;
        offset += page.itemCategoriesPagination.limit;
      }
    },
  });
}
