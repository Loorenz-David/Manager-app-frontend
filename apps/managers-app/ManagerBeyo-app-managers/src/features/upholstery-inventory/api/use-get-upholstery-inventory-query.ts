import { useQuery } from "@tanstack/react-query";

import type { UpholsteryInventoryId } from "@/types/common";

import { getUpholsteryInventory } from "./get-upholstery-inventory";
import { upholsteryInventoryKeys } from "./upholstery-inventory-keys";

export function useGetUpholsteryInventoryQuery(
  inventoryId: UpholsteryInventoryId,
) {
  return useQuery({
    queryKey: upholsteryInventoryKeys.detail(inventoryId),
    queryFn: () => getUpholsteryInventory(inventoryId),
    enabled: Boolean(inventoryId),
  });
}
