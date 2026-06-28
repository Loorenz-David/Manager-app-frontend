import type { WorkingSectionId } from "@beyo/lib";
import type { SocketEventHandlers } from "@beyo/realtime";
import {
  itemUpholsteryKeys as tasksItemUpholsteryKeys,
  taskStepKeys as tasksPackageStepKeys,
} from "@beyo/tasks";
import { workerWorkingSectionKeys } from "@/features/working_sections/api/working-section-keys";
import { taskStepKeys } from "./api/task-step-keys";
import {
  STEP_TERMINAL_STATES,
  type StepState,
  type UserLastActivePayload,
} from "./types";

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
      queryKey: tasksPackageStepKeys.byTaskAll(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: workerWorkingSectionKeys.mine(),
      refetchType: "active",
    });

    // Extract all changed IDs from the coalesced event (one entry per changed step)
    const changedClientIds = new Set(
      payloads.map((p: { client_id: string }) => p.client_id),
    );

    const cachedPayload = queryClient.getQueryData<UserLastActivePayload>(
      taskStepKeys.userLastActive(),
    );

    // Single mode: if the active step hit terminal, clear immediately without a network round-trip
    if (!cachedPayload?.batchSteps?.length && cachedPayload?.step) {
      if (
        changedClientIds.has(cachedPayload.step.client_id) &&
        payloads.some(
          (p: { client_id: string; new_state: string }) =>
            p.client_id === cachedPayload.step!.client_id &&
            STEP_TERMINAL_STATES.has(p.new_state as StepState),
        )
      ) {
        queryClient.setQueryData<UserLastActivePayload>(
          taskStepKeys.userLastActive(),
          { step: null, batchSteps: null },
        );
        return;
      }
    }

    // Batch mode: if ALL batch steps hit terminal, clear immediately
    if (cachedPayload?.batchSteps?.length) {
      const allTerminal = cachedPayload.batchSteps.every((bs) =>
        payloads.some(
          (p: { client_id: string; new_state: string }) =>
            p.client_id === bs.client_id &&
            STEP_TERMINAL_STATES.has(p.new_state as StepState),
        ),
      );
      if (allTerminal) {
        queryClient.setQueryData<UserLastActivePayload>(
          taskStepKeys.userLastActive(),
          { step: null, batchSteps: null },
        );
        return;
      }
    }

    // Single invalidate — not one per changed item
    void queryClient.invalidateQueries({
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
      queryKey: tasksPackageStepKeys.byTaskAll(),
      refetchType: "active",
    });
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
      queryKey: tasksPackageStepKeys.byTaskAll(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: workerWorkingSectionKeys.mine(),
      refetchType: "active",
    });

    const cachedPayload = queryClient.getQueryData<UserLastActivePayload>(
      taskStepKeys.userLastActive(),
    );
    const activeStepId = cachedPayload?.step?.client_id;
    const deletedIds = new Set(
      payloads.map((p: { client_id: string }) => p.client_id),
    );

    if (activeStepId && deletedIds.has(activeStepId)) {
      queryClient.setQueryData<UserLastActivePayload>(
        taskStepKeys.userLastActive(),
        { step: null, batchSteps: null },
      );
    } else {
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.userLastActive(),
        refetchType: "active",
      });
    }
  },

  "task:updated": (payloads, { queryClient }) => {
    const cachedPayload = queryClient.getQueryData<UserLastActivePayload>(
      taskStepKeys.userLastActive(),
    );
    const activeTaskId =
      cachedPayload?.step?.task.client_id ??
      cachedPayload?.batchSteps?.[0]?.task.client_id;

    if (
      activeTaskId &&
      payloads.some(
        (payload: { client_id: string }) => payload.client_id === activeTaskId,
      )
    ) {
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.userLastActive(),
        refetchType: "active",
      });
    }
  },

  "task:state-changed": (payloads, { queryClient }) => {
    const cachedPayload = queryClient.getQueryData<UserLastActivePayload>(
      taskStepKeys.userLastActive(),
    );
    const activeTaskId =
      cachedPayload?.step?.task.client_id ??
      cachedPayload?.batchSteps?.[0]?.task.client_id;

    if (
      activeTaskId &&
      payloads.some(
        (payload: { client_id: string }) => payload.client_id === activeTaskId,
      )
    ) {
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.userLastActive(),
        refetchType: "active",
      });
    }
  },
};
