import type { QueryClient } from "@tanstack/react-query";
import { itemUpholsteryKeys } from "@beyo/tasks";

import { taskKeys } from "@/features/tasks/api/task-keys";
import { upholsteryInventoryKeys, upholsteryKeys } from "@/features/upholstery/api/upholstery-keys";
import { upholsteryOrderingKeys } from "@/features/upholstery-ordering/api/upholstery-ordering-keys";
import type { UpholsteryInventoryId } from "@/types/common";

export function invalidateAfterInventoryMutation(
  queryClient: QueryClient,
  { inventoryId }: { inventoryId?: UpholsteryInventoryId } = {},
): void {
  void queryClient.invalidateQueries({
    queryKey: upholsteryInventoryKeys.lists(),
  });
  void queryClient.invalidateQueries({
    queryKey: upholsteryInventoryKeys.details(),
  });
  void queryClient.invalidateQueries({
    queryKey: upholsteryKeys.pickerLists(),
  });
  void queryClient.invalidateQueries({
    queryKey: upholsteryOrderingKeys.all,
  });
  void queryClient.invalidateQueries({
    queryKey: taskKeys.lists(),
  });
  void queryClient.invalidateQueries({
    queryKey: taskKeys.details(),
  });
  void queryClient.invalidateQueries({
    queryKey: itemUpholsteryKeys.all,
  });

  if (inventoryId) {
    void queryClient.invalidateQueries({
      queryKey: upholsteryInventoryKeys.detail(inventoryId),
    });
  }
}
