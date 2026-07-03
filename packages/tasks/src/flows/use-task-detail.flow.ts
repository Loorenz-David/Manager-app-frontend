import { useMemo } from "react";

import {
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  type TaskWorkingSectionsSurfaceOpeners,
  type TaskWorkingSectionsSurfaceProps,
} from "@beyo/task-working-sections";
import { preloadWorkingSectionWorkerPickerSurface } from "@beyo/working-sections";
import { useSurfaceStore } from "@beyo/ui";

import {
  ITEM_QUANTITY_SHEET_SURFACE_ID,
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_ASSORTMENT_SHEET_SURFACE_ID,
  TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID,
  TASK_EDIT_SLIDE_SURFACE_ID,
  TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID,
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
} from "../surface-ids";

export function useTaskDetailFlow(taskId: string, itemId: string | null) {
  const surfaceOpeners = useMemo<TaskWorkingSectionsSurfaceOpeners>(
    () => ({
      closeSlide: () =>
        useSurfaceStore.getState().close(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID),
      closeDiscardSheet: () =>
        useSurfaceStore
          .getState()
          .close(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID),
      openDiscardChangesSheet: (props) =>
        useSurfaceStore
          .getState()
          .open(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID, props),
      reopenSlideAfterError: (props) =>
        useSurfaceStore
          .getState()
          .open(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, props),
      preloadWorkerPickerSurface: preloadWorkingSectionWorkerPickerSurface,
    }),
    [],
  );

  return {
    openMenu: () => {
      useSurfaceStore.getState().open(TASK_ACTIONS_SHEET_SURFACE_ID, {
        taskId,
        itemId,
      });
    },
    openReadyByAtSheet: () =>
      useSurfaceStore.getState().open(TASK_READY_BY_AT_SHEET_SURFACE_ID, {
        taskId,
      }),
    openAssortmentSheet: () =>
      useSurfaceStore.getState().open(TASK_ASSORTMENT_SHEET_SURFACE_ID, {
        taskId,
      }),
    openFulfillmentMethodSheet: () =>
      useSurfaceStore
        .getState()
        .open(TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID, { taskId }),
    openDeliveryDateSheet: () =>
      useSurfaceStore
        .getState()
        .open(TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID, { taskId }),
    openEditTask: () =>
      useSurfaceStore.getState().open(TASK_EDIT_SLIDE_SURFACE_ID, { taskId }),
    openWorkingSectionsSlide: () =>
      useSurfaceStore.getState().open(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, {
        taskId,
        surfaceOpeners,
      } satisfies TaskWorkingSectionsSurfaceProps),
    openQuantitySheet: () => {
      if (!itemId) {
        return;
      }

      useSurfaceStore.getState().open(ITEM_QUANTITY_SHEET_SURFACE_ID, {
        taskId,
        itemId,
      });
    },
    openUpholsteryAmountSheet: (itemUpholsteryId: string) =>
      useSurfaceStore
        .getState()
        .open(ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID, {
          taskId,
          itemUpholsteryId,
        }),
    openFlowRecord: (flowRecordId: string) =>
      useSurfaceStore
        .getState()
        .open(TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID, {
          taskId,
          flowRecordId,
        }),
  };
}

export type TaskDetailFlow = ReturnType<typeof useTaskDetailFlow>;
