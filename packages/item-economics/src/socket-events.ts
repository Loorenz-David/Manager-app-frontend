import type { TaskId } from "@beyo/lib";
import type { SocketEventHandlers } from "@beyo/realtime";

import { itemEconomicsKeys } from "./api/item-economics-keys";

export const itemEconomicsSocketEvents: SocketEventHandlers = {
  "task:step-state-changed": (_payload, { queryClient }) => {
    // The payload IDs belong to steps, not tasks. There is no safe targeted
    // lookup, so invalidate the task branch and let active observers refetch.
    queryClient.invalidateQueries({
      queryKey: itemEconomicsKeys.tasks(),
      refetchType: "active",
    });
  },

  "item_economics:evaluation-committed": (
    { client_id },
    { queryClient },
  ) => {
    queryClient.invalidateQueries({
      queryKey: itemEconomicsKeys.taskProductionTime(client_id as TaskId),
      refetchType: "active",
    });
  },
};
