export const itemCategoryKeys = {
  all: ["item-categories"] as const,
  list: (params: { limit: number; offset: number; q?: string }) =>
    [...itemCategoryKeys.all, "list", params] as const,
};
