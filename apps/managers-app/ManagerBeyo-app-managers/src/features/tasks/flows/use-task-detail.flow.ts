import { useSurface } from "@/hooks/use-surface";

import {
  ITEM_POSITION_SHEET_SURFACE_ID,
  ITEM_QUANTITY_SHEET_SURFACE_ID,
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
  preloadPinNotificationsSlideSurface,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID,
  TASK_EDIT_SLIDE_SURFACE_ID,
  TASK_SCHEDULED_DATE_SHEET_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
} from "../surfaces";

export function useTaskDetailFlow(
  taskId: string,
  itemId: string | null,
) {
  const surface = useSurface();

  return {
    openMenu: () => {
      preloadPinNotificationsSlideSurface();
      surface.open(TASK_ACTIONS_SHEET_SURFACE_ID, { taskId, itemId });
    },
    openScheduleSheet: () =>
      surface.open(TASK_SCHEDULED_DATE_SHEET_SURFACE_ID, { taskId }),
    openEditTask: () => surface.open(TASK_EDIT_SLIDE_SURFACE_ID, { taskId }),
    openWorkingSectionsSlide: () =>
      surface.open(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, { taskId }),
    openQuantitySheet: () => {
      if (!itemId) {
        return;
      }

      surface.open(ITEM_QUANTITY_SHEET_SURFACE_ID, { taskId, itemId });
    },
    openPositionSheet: () => {
      if (!itemId) {
        return;
      }

      surface.open(ITEM_POSITION_SHEET_SURFACE_ID, { taskId, itemId });
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
