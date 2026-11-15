import { useInfiniteQuery } from "@tanstack/react-query";

import type { UpholsteryInventoryId } from "@/types/common";

import { listUpholsteryInventoryHistory } from "./list-upholstery-inventory-history";
import { upholsteryInventoryKeys } from "./upholstery-inventory-keys";

export const INVENTORY_HISTORY_PAGE_SIZE = 20;

type UseUpholsteryInventoryHistoryInfiniteQueryParams = {
  inventoryId: UpholsteryInventoryId;
  pageSize?: number;
};

export function useUpholsteryInventoryHistoryInfiniteQuery({
  inventoryId,
  pageSize = INVENTORY_HISTORY_PAGE_SIZE,
}: UseUpholsteryInventoryHistoryInfiniteQueryParams) {
  return useInfiniteQuery({
    queryKey: upholsteryInventoryKeys.history(inventoryId),
    queryFn: ({ pageParam }) =>
      listUpholsteryInventoryHistory(inventoryId, {
        limit: pageSize,
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more && lastPage.pagination.next_cursor
        ? lastPage.pagination.next_cursor
        : undefined,
    enabled: Boolean(inventoryId),
  });
}
