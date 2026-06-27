import { quickTaskKeys } from "@beyo/task-working-sections";
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
    queryClient.invalidateQueries({
      queryKey: quickTaskKeys.all,
      refetchType: "active",
    });
  },

  "task:updated": (payloads, { queryClient }) => {
    for (const { client_id } of payloads) {
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
      queryKey: quickTaskKeys.all,
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
    queryClient.invalidateQueries({
      queryKey: quickTaskKeys.all,
      refetchType: "active",
    });
  },

  "task:state-changed": (payloads, { queryClient }) => {
    for (const { client_id } of payloads) {
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
      queryKey: quickTaskKeys.all,
      refetchType: "active",
    });
  },

  "task:step-assigned": ({ client_id }, { queryClient }) => {
    void client_id;
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.all,
      refetchType: "active",
    });
  },

  "task:step-state-changed": (payloads, { queryClient }) => {
    for (const { client_id } of payloads) {
      queryClient.invalidateQueries({
        queryKey: taskStepKeys.detail(client_id as TaskStepId),
        refetchType: "active",
      });
    }
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

  "task:step-deleted": (payloads, { queryClient }) => {
    for (const { client_id } of payloads) {
      queryClient.removeQueries({
        queryKey: taskStepKeys.detail(client_id as TaskStepId),
      });
    }
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
