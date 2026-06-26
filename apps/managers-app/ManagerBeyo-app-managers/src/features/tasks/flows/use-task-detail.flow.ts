import { useMemo } from "react";

import {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  type TaskWorkingSectionsSurfaceOpeners,
  type TaskWorkingSectionsSurfaceProps,
} from "@beyo/tasks";
import { preloadWorkingSectionWorkerPickerSurface } from "@beyo/working-sections";
import { useSurfaceStore } from "@beyo/ui";
import { useSurface } from "@/hooks/use-surface";

import {
  ITEM_QUANTITY_SHEET_SURFACE_ID,
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
  preloadPinNotificationsSlideSurface,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID,
  TASK_EDIT_SLIDE_SURFACE_ID,
} from "../surfaces";

export function useTaskDetailFlow(
  taskId: string,
  itemId: string | null,
) {
  const surface = useSurface();
  const surfaceOpeners = useMemo<TaskWorkingSectionsSurfaceOpeners>(
    () => ({
      closeSlide: () =>
        useSurfaceStore.getState().close(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID),
      closeDiscardSheet: () =>
        useSurfaceStore
          .getState()
          .close(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID),
      openDiscardChangesSheet: (props) =>
        surface.open(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID, props),
      reopenSlideAfterError: (props) =>
        useSurfaceStore
          .getState()
          .open(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, props),
      preloadWorkerPickerSurface: preloadWorkingSectionWorkerPickerSurface,
    }),
    [surface],
  );

  return {
    openMenu: () => {
      preloadPinNotificationsSlideSurface();
      surface.open(TASK_ACTIONS_SHEET_SURFACE_ID, { taskId, itemId });
    },
    openReadyByAtSheet: () =>
      surface.open(TASK_READY_BY_AT_SHEET_SURFACE_ID, { taskId }),
    openDeliveryDateSheet: () =>
      surface.open(TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID, { taskId }),
    openEditTask: () => surface.open(TASK_EDIT_SLIDE_SURFACE_ID, { taskId }),
    openWorkingSectionsSlide: () =>
      surface.open(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, {
        taskId,
        surfaceOpeners,
      } satisfies TaskWorkingSectionsSurfaceProps),
    openQuantitySheet: () => {
      if (!itemId) {
        return;
      }

      surface.open(ITEM_QUANTITY_SHEET_SURFACE_ID, { taskId, itemId });
    },
    openUpholsteryAmountSheet: (itemUpholsteryId: string) =>
      surface.open(ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID, {
        taskId,
        itemUpholsteryId,
      }),
    openFlowRecord: (flowRecordId: string) =>
      surface.open(TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID, {
        taskId,
        flowRecordId,
      }),
  };
}
