export const TASK_READY_BY_AT_SHEET_SURFACE_ID = "task-ready-by-at-sheet";
export const TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID =
  "task-scheduled-delivery-sheet";

export type TaskReadyByAtSheetSurfaceProps = {
  taskId: string;
};

export type TaskScheduledDeliverySheetSurfaceProps = {
  taskId: string;
  mode?: "edit" | "view";
};
