import { useQuery } from "@tanstack/react-query";

import { upholsteryInventoryKeys } from "@/features/upholstery/api/upholstery-keys";
import type { UpholsteryInventoryId } from "@/types/common";

import { getUpholsteryInventory } from "./get-upholstery-inventory";

export function useGetUpholsteryInventoryQuery(
  inventoryId: UpholsteryInventoryId,
) {
  return useQuery({
    queryKey: upholsteryInventoryKeys.detail(inventoryId),
    queryFn: () => getUpholsteryInventory(inventoryId),
    enabled: Boolean(inventoryId),
  });
}
