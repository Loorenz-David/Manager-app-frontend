import type { SocketEventHandlers } from "@beyo/realtime";
import type { TaskId, TaskStepId } from "@/types/common";
import { taskKeys } from "./api/task-keys";
import { taskStepKeys } from "./subfeatures/task_steps/api/task-step-keys";

export const taskSocketEvents: SocketEventHandlers = {
  "task:created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
  },

  "task:updated": ({ client_id }, { queryClient }) => {
    const taskId = client_id as TaskId;

    queryClient.invalidateQueries({
      queryKey: taskKeys.detail(taskId),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
  },

  "task:deleted": ({ client_id }, { queryClient }) => {
    const taskId = client_id as TaskId;

    queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) });
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
  },

  "task:state-changed": ({ client_id }, { queryClient }) => {
    const taskId = client_id as TaskId;

    queryClient.invalidateQueries({
      queryKey: taskKeys.detail(taskId),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
  },

  "task:step-assigned": ({ client_id }, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.detail(client_id as TaskStepId),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskKeys.details(),
      refetchType: "active",
    });
  },

  "task:step-state-changed": ({ client_id }, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.detail(client_id as TaskStepId),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskKeys.details(),
      refetchType: "active",
    });
  },

  "task:step-created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskKeys.details(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskKeys.lists(),
      refetchType: "active",
    });
  },

  "task:step-deleted": ({ client_id }, { queryClient }) => {
    queryClient.removeQueries({
      queryKey: taskStepKeys.detail(client_id as TaskStepId),
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
};
