import type { WorkingSectionId } from "@beyo/lib";
import type { SocketEventHandlers } from "@beyo/realtime";
import { itemUpholsteryKeys as tasksItemUpholsteryKeys } from "@beyo/tasks";
import { taskStepKeys } from "./api/task-step-keys";

export const taskStepSocketEvents: SocketEventHandlers = {
  "task:step-assigned": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.sectionLists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.userLastActive(),
      refetchType: "active",
    });
  },

  "task:step-state-changed": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.sectionLists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.userLastActive(),
      refetchType: "active",
    });
  },

  "item:upholstery-created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: tasksItemUpholsteryKeys.all,
      refetchType: "active",
    });
  },

  "item:upholstery-updated": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: tasksItemUpholsteryKeys.all,
      refetchType: "active",
    });
  },

  "item:upholstery-deleted": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: tasksItemUpholsteryKeys.all,
      refetchType: "active",
    });
  },

  "item:upholstery-requirement-state-changed": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: tasksItemUpholsteryKeys.all,
      refetchType: "active",
    });
  },

  "task:step-created": ({ working_section_id }, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.sectionListsBySection(
        working_section_id as WorkingSectionId,
      ),
      refetchType: "active",
    });
  },

  "task:step-deleted": ({ working_section_id }, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.sectionListsBySection(
        working_section_id as WorkingSectionId,
      ),
      refetchType: "active",
    });
  },
};
