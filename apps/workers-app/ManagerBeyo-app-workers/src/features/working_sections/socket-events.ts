import type { SocketEventHandlers } from "@beyo/realtime";
import { taskStepKeys } from "@/features/task_steps/api/task-step-keys";
import { workerWorkingSectionKeys } from "./api/working-section-keys";

export const workerWorkingSectionSocketEvents: SocketEventHandlers = {
  "working_section:created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: workerWorkingSectionKeys.mine(),
      refetchType: "active",
    });
  },

  "working_section:updated": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: workerWorkingSectionKeys.mine(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.sectionLists(),
      refetchType: "active",
    });
  },

  "working_section:deleted": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: workerWorkingSectionKeys.mine(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.sectionLists(),
      refetchType: "active",
    });
  },

  "user:working_sections_updated": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: workerWorkingSectionKeys.mine(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.sectionLists(),
      refetchType: "active",
    });
  },
};
