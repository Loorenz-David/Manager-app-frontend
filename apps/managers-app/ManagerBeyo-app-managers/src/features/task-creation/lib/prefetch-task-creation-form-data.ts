import type { QueryClient } from "@tanstack/react-query";

import { fetchItemCategoriesPicker } from "@/features/items/api/fetch-item-categories-picker";
import { itemCategoryPickerKeys } from "@/features/items/api/item-category-picker-keys";
import { fetchWorkingSectionsPicker } from "@/features/working-sections/api/fetch-working-sections-picker";
import { workingSectionKeys } from "@/features/working-sections/api/working-section-keys";

export async function prefetchTaskCreationFormData(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: itemCategoryPickerKeys.list(),
      queryFn: () => fetchItemCategoriesPicker(),
      staleTime: 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: workingSectionKeys.list(),
      queryFn: fetchWorkingSectionsPicker,
      staleTime: 60_000,
    }),
  ]);
}
