import type { WorkingSectionId } from "@beyo/lib";
import type { SocketEventHandlers } from "@beyo/realtime";
import {
  itemUpholsteryKeys as tasksItemUpholsteryKeys,
  taskStepKeys as tasksPackageStepKeys,
} from "@beyo/tasks";
import { workerWorkingSectionKeys } from "@/features/working_sections/api/working-section-keys";
import { taskStepKeys } from "./api/task-step-keys";
import type { UserLastActivePayload } from "./types";

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

  "task:step-state-changed": (_payloads, { queryClient }) => {
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

    // A completed/terminal step is still the worker's last-interacted step, and the
    // card is designed to display it (green "Completed" state). Refetch rather than
    // optimistically clearing to null: the earlier terminal-clear made the card
    // vanish until a manual reload — the finalize socket arrives before the
    // transition request resolves, and the `completed` transition intentionally
    // skips its own userLastActive invalidate, so nothing re-fetched it. React
    // Query keeps the optimistic completed step visible during the background
    // refetch, so there is no flicker.
    void queryClient.invalidateQueries({
      queryKey: taskStepKeys.userLastActive(),
      refetchType: "active",
    });
  },

  "task:step-acknowledgment-created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.reassignmentAcks(),
      refetchType: "active",
    });
  },

  "task:step-acknowledgment-removed": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.reassignmentAcks(),
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
