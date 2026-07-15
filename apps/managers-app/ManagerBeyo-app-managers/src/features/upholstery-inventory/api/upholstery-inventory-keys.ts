import type { UpholsteryInventoryId } from "@/types/common";

import type { ListUpholsteryInventoriesParams } from "../types";

export const upholsteryInventoryKeys = {
  all: ["upholstery-inventories"] as const,
  lists: () => [...upholsteryInventoryKeys.all, "list"] as const,
  list: (params: ListUpholsteryInventoriesParams = {}) =>
    [...upholsteryInventoryKeys.lists(), params] as const,
  details: () => [...upholsteryInventoryKeys.all, "detail"] as const,
  detail: (id: UpholsteryInventoryId) =>
    [...upholsteryInventoryKeys.details(), id] as const,
};
