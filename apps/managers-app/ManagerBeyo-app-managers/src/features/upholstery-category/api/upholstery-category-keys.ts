import type { ListUpholsteryCategoriesParams } from "../types";

export const upholsteryCategoryKeys = {
  all: ["upholstery-categories"] as const,
  lists: () => [...upholsteryCategoryKeys.all, "list"] as const,
  list: (params: ListUpholsteryCategoriesParams = {}) =>
    [...upholsteryCategoryKeys.lists(), params] as const,
  details: () => [...upholsteryCategoryKeys.all, "detail"] as const,
  detail: (id: string) => [...upholsteryCategoryKeys.details(), id] as const,
};
