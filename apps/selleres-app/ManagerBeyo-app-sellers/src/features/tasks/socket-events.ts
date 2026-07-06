import { quickTaskKeys } from "@beyo/task-working-sections";
import type { SocketEventHandlers } from "@beyo/realtime";
import { customerCoordinationKeys } from "@beyo/task-customer-coordination";
import { taskKeys, taskStepKeys } from "@beyo/tasks";
import type { TaskId } from "@/types/common";

// Workspace events are declared as arrays but the backend delivers a single object
// for the non-batched emit path (push_workspace_refresh) and an array only for the
// batched path. Normalize so a single-object payload can't throw "not iterable" and
// abort every invalidation in the handler.
function asList<T>(payload: T | T[]): T[] {
  return Array.isArray(payload) ? payload : [payload];
}

export const taskSocketEvents: SocketEventHandlers = {
  "task:created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: quickTaskKeys.all,
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskKeys.postHandling(),
      refetchType: "active",
    });
    // Coordinate home box: refresh its pending count + the batch slide's task list.
    queryClient.invalidateQueries({
      queryKey: customerCoordinationKeys.all,
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
    queryClient.invalidateQueries({
      queryKey: taskKeys.postHandling(),
      refetchType: "all",
    });
    queryClient.invalidateQueries({
      queryKey: quickTaskKeys.all,
      refetchType: "active",
    });
    // Coordinate home box: refresh its pending count + the batch slide's task list.
    queryClient.invalidateQueries({
      queryKey: customerCoordinationKeys.all,
      refetchType: "all",
    });
  },

  "task:deleted": ({ client_id }, { queryClient }) => {
    const taskId = client_id as TaskId;

    queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) });
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: quickTaskKeys.all,
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
    queryClient.invalidateQueries({
      queryKey: taskKeys.postHandling(),
      refetchType: "all",
    });
    queryClient.invalidateQueries({
      queryKey: quickTaskKeys.all,
      refetchType: "active",
    });
    // Coordinate home box: refresh its pending count + the batch slide's task list.
    queryClient.invalidateQueries({
      queryKey: customerCoordinationKeys.all,
      refetchType: "all",
    });
  },

  "task:step-assigned": ({ client_id }, { queryClient }) => {
    void client_id;
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.all,
      refetchType: "active",
    });
  },

  "task:step-state-changed": (_payloads, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.all,
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskKeys.details(),
      refetchType: "active",
    });
  },

  "task:step-created": (_payloads, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.all,
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskKeys.details(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
  },

  "task:step-deleted": (_payloads, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.all,
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskKeys.details(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
  },

  "task:step-readiness-changed": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.all,
      refetchType: "active",
    });
  },

  "task:step-updated": (_payloads, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.all,
      refetchType: "active",
    });
  },
};
