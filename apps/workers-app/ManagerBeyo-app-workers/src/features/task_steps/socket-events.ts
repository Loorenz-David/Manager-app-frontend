import type { WorkingSectionId } from "@beyo/lib";
import type { SocketEventHandlers } from "@beyo/realtime";
import { itemUpholsteryKeys as tasksItemUpholsteryKeys } from "@beyo/tasks";
import { workerWorkingSectionKeys } from "@/features/working_sections/api/working-section-keys";
import { taskStepKeys } from "./api/task-step-keys";
import { STEP_TERMINAL_STATES, type StepState, type TaskStep } from "./types";

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

  "task:step-state-changed": (payloads, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.sectionLists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: workerWorkingSectionKeys.mine(),
      refetchType: "active",
    });

    // Optimisation: if the active step is already in cache and its new state is
    // terminal, clear immediately so the card disappears without a network round
    // trip. The server would return null for this step anyway.
    const activeStep = queryClient.getQueryData<TaskStep | null>(
      taskStepKeys.userLastActive(),
    );
    if (activeStep) {
      const terminalMatch = payloads.find(
        (p) =>
          p.client_id === activeStep.client_id &&
          STEP_TERMINAL_STATES.has(p.new_state as StepState),
      );
      if (terminalMatch) {
        queryClient.setQueryData(taskStepKeys.userLastActive(), null);
        return;
      }
    }

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

  "task:step-created": (payloads, { queryClient }) => {
    const sectionIds = [
      ...new Set(payloads.map((payload) => payload.working_section_id)),
    ];

    for (const id of sectionIds) {
      queryClient.invalidateQueries({
        queryKey: taskStepKeys.sectionListsBySection(id as WorkingSectionId),
        refetchType: "active",
      });
    }
    queryClient.invalidateQueries({
      queryKey: workerWorkingSectionKeys.mine(),
      refetchType: "active",
    });
  },

  "task:step-deleted": (payloads, { queryClient }) => {
    const sectionIds = [
      ...new Set(payloads.map((payload) => payload.working_section_id)),
    ];

    for (const id of sectionIds) {
      queryClient.invalidateQueries({
        queryKey: taskStepKeys.sectionListsBySection(id as WorkingSectionId),
        refetchType: "active",
      });
    }
    queryClient.invalidateQueries({
      queryKey: workerWorkingSectionKeys.mine(),
      refetchType: "active",
    });

    // Try to clear immediately if the deleted step is the one displayed.
    // Fall back to a refetch when the cache is cold — server will return null.
    const activeStep = queryClient.getQueryData<TaskStep | null>(
      taskStepKeys.userLastActive(),
    );
    if (activeStep && payloads.some((p) => p.client_id === activeStep.client_id)) {
      queryClient.setQueryData(taskStepKeys.userLastActive(), null);
    } else {
      queryClient.invalidateQueries({
        queryKey: taskStepKeys.userLastActive(),
        refetchType: "active",
      });
    }
  },

  "task:updated": (payloads, { queryClient }) => {
    const activeStep = queryClient.getQueryData<TaskStep | null>(
      taskStepKeys.userLastActive(),
    );
    if (
      activeStep &&
      payloads.some((payload) => payload.client_id === activeStep.task.client_id)
    ) {
      queryClient.invalidateQueries({
        queryKey: taskStepKeys.userLastActive(),
        refetchType: "active",
      });
    }
  },

  "task:state-changed": (payloads, { queryClient }) => {
    const activeStep = queryClient.getQueryData<TaskStep | null>(
      taskStepKeys.userLastActive(),
    );
    if (
      activeStep &&
      payloads.some((payload) => payload.client_id === activeStep.task.client_id)
    ) {
      queryClient.invalidateQueries({
        queryKey: taskStepKeys.userLastActive(),
        refetchType: "active",
      });
    }
  },
};
