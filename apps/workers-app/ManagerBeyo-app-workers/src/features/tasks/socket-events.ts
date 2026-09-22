import type { TaskId } from "@beyo/lib";
import type { SocketEventHandlers } from "@beyo/realtime";
import { taskKeys } from "@beyo/tasks";

// Workspace events are declared as arrays but the backend delivers a single
// object for the non-batched emit path and an array only for the batched
// path. Normalize so a single-object payload can't throw "not iterable".
function asList<T>(payload: T | T[]): T[] {
  return Array.isArray(payload) ? payload : [payload];
}

/**
 * Keeps the shared task listing and task detail fresh in the workers app.
 * A trimmed copy of the managers' handler: only the task list/detail keys —
 * no post-handling, quick-assign or worker-stats caches live here. Step events
 * are handled by `task_steps/socket-events.ts`.
 */
export const taskSocketEvents: SocketEventHandlers = {
  "task:created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
  },

  "task:updated": (payloads, { queryClient }) => {
    for (const { client_id } of asList(payloads)) {
      queryClient.invalidateQueries({
        queryKey: taskKeys.detail(client_id as TaskId),
        refetchType: "active",
      });
    }
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
  },

  "task:deleted": ({ client_id }, { queryClient }) => {
    queryClient.removeQueries({ queryKey: taskKeys.detail(client_id as TaskId) });
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
  },

  "task:state-changed": (payloads, { queryClient }) => {
    for (const { client_id } of asList(payloads)) {
      queryClient.invalidateQueries({
        queryKey: taskKeys.detail(client_id as TaskId),
        refetchType: "active",
      });
    }
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
  },
};
